"""
Mock-сервер для тестирования DuelAPI v2 без БД.
Хранит всё в памяти.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import time

app = Flask(__name__)
CORS(app)

# In-memory storage
rooms = {}        # room_id -> dict
players = {}      # player_id -> dict
rounds = {}       # round_id -> dict
answers = {}      # answer_id -> dict
user_map = {}     # chat_id -> internal_user_id
user_counter = [1]

MOCK_TASKS = [
    {"id": 1, "description": "Ты случайно назвал учителя «мамой» на уроке. Что скажешь?"},
    {"id": 2, "description": "Ты пришёл на свидание, а там — твой бывший/бывшая с новым партнёром. Твои действия?"},
    {"id": 3, "description": "Ты отправил скриншот сплетен тому, о ком писал. Реакция?"},
    {"id": 4, "description": "На собеседовании ты назвал компанию конкурентом. Как выкрутишься?"},
    {"id": 5, "description": "Ты лайкнул фото трёхлетней давности у человека, который тебе нравится. Ваш ход?"},
    {"id": 6, "description": "Ты спел песню в караоке, забыв что микрофон был выключен. Что дальше?"},
    {"id": 7, "description": "Коллега показывает фото своего ребёнка, а ты говоришь «какой... интересный». Спасай ситуацию!"},
    {"id": 8, "description": "Ты пожал руку человеку, который просто тянулся поздороваться с кем-то за тобой. Ваши действия?"},
]


def get_user_id(chat_id):
    chat_id = str(chat_id)
    if chat_id not in user_map:
        uid = user_counter[0]
        user_counter[0] += 1
        user_map[chat_id] = uid
    return user_map[chat_id]


def get_room_state(room, user_id):
    """Собрать состояние комнаты."""
    room_players = [p for p in players.values() if p['room_id'] == room['id']]
    players_data = []
    for p in room_players:
        players_data.append({
            'user_id': p['user_id'],
            'chat_id': p['chat_id'],
            'nickname': p['nickname'] or f'Игрок {p["id"]}',
            'total_score': p['total_score'],
            'is_creator': p['user_id'] == room['creator_id'],
        })

    result = {
        'status': 'success',
        'room_id': room['id'],
        'code': room['code'],
        'room_status': room['status'],
        'max_players': room['max_players'],
        'current_round': room['current_round'],
        'players': players_data,
        'players_count': len(players_data),
    }

    # Текущий раунд
    if room['status'] == 'playing':
        current = None
        for r in rounds.values():
            if r['room_id'] == room['id'] and r['round_number'] == room['current_round']:
                current = r
                break

        if current:
            task = next((t for t in MOCK_TASKS if t['id'] == current['task_id']), None)
            result['task'] = task['description'] if task else 'Задача не найдена'

            # Ответы в этом раунде
            round_answers = [a for a in answers.values() if a['round_id'] == current['id']]
            player_record = next((p for p in room_players if p['user_id'] == user_id), None)
            result['answered'] = player_record and any(
                a['player_id'] == player_record['id'] for a in round_answers
            )

            result['answers'] = []
            for a in round_answers:
                p = players.get(a['player_id'], {})
                result['answers'].append({
                    'nickname': p.get('nickname', '?'),
                    'answer': a['answer'],
                    'grade': a['grade'],
                    'comment': a.get('comment', ''),
                })

            result['current_round_data'] = {
                'all_answered': len(round_answers) >= len(room_players)
            }

    # История раундов
    room_rounds = sorted(
        [r for r in rounds.values() if r['room_id'] == room['id']],
        key=lambda r: r['round_number']
    )
    rounds_data = []
    for r in room_rounds:
        round_answers = [a for a in answers.values() if a['round_id'] == r['id']]
        ra = []
        for a in round_answers:
            p = players.get(a['player_id'], {})
            ra.append({
                'nickname': p.get('nickname', '?'),
                'answer': a['answer'],
                'grade': a['grade'],
                'comment': a.get('comment', ''),
            })
        rounds_data.append({
            'round_number': r['round_number'],
            'status': r['status'],
            'answers': ra,
        })
    result['rounds'] = rounds_data

    return result


@app.route('/api/duel2/create', methods=['POST'])
def duel2_create():
    data = request.json or {}
    chat_id = data.get('user_id', '')
    nickname = data.get('nickname', '')
    max_players = min(max(data.get('max_players', 2), 2), 10)

    user_id = get_user_id(chat_id)
    code = str(random.randint(100, 999))
    while any(r['code'] == code and r['status'] != 'finished' for r in rooms.values()):
        code = str(random.randint(100, 999))

    room_id = len(rooms) + 1
    room = {
        'id': room_id,
        'code': code,
        'creator_id': user_id,
        'status': 'waiting',
        'max_players': max_players,
        'current_round': 0,
    }
    rooms[room_id] = room

    player_id = len(players) + 1
    players[player_id] = {
        'id': player_id,
        'room_id': room_id,
        'user_id': user_id,
        'chat_id': chat_id,
        'nickname': nickname,
        'total_score': 0,
    }

    return jsonify(get_room_state(room, user_id))


@app.route('/api/duel2/accept', methods=['POST'])
def duel2_accept():
    data = request.json or {}
    chat_id = data.get('user_id', '')
    code = str(data.get('code', '')).strip()
    nickname = data.get('nickname', '')

    user_id = get_user_id(chat_id)

    room = next((r for r in rooms.values() if r['code'] == code and r['status'] != 'finished'), None)
    if not room:
        return jsonify({"status": "error", "message": "Код не найден"}), 404

    # Уже в комнате?
    existing = next((p for p in players.values() if p['room_id'] == room['id'] and p['user_id'] == user_id), None)
    if existing:
        return jsonify(get_room_state(room, user_id))

    room_players = [p for p in players.values() if p['room_id'] == room['id']]
    if len(room_players) >= room['max_players']:
        return jsonify({"status": "error", "message": "Комната полна"}), 400

    if room['status'] != 'waiting':
        return jsonify({"status": "error", "message": "Игра уже началась"}), 400

    player_id = len(players) + 1
    players[player_id] = {
        'id': player_id,
        'room_id': room['id'],
        'user_id': user_id,
        'chat_id': chat_id,
        'nickname': nickname,
        'total_score': 0,
    }

    return jsonify(get_room_state(room, user_id))


@app.route('/api/duel2/start', methods=['POST'])
def duel2_start():
    data = request.json or {}
    user_id = get_user_id(data.get('user_id', ''))

    room = next((r for r in rooms.values() if r['creator_id'] == user_id and r['status'] == 'waiting'), None)
    if not room:
        return jsonify({"status": "error", "message": "Нет ожидающих комнат"}), 404

    room_players = [p for p in players.values() if p['room_id'] == room['id']]
    if len(room_players) < 2:
        return jsonify({"status": "error", "message": "Нужно минимум 2 игрока"}), 400

    task = random.choice(MOCK_TASKS)
    room['status'] = 'playing'
    room['current_round'] = 1

    round_id = len(rounds) + 1
    rounds[round_id] = {
        'id': round_id,
        'room_id': room['id'],
        'task_id': task['id'],
        'round_number': 1,
        'status': 'active',
    }

    return jsonify(get_room_state(room, user_id))


@app.route('/api/duel2/answer', methods=['POST'])
def duel2_answer():
    data = request.json or {}
    chat_id = data.get('user_id', '')
    room_id = data.get('room_id', '')
    answer_text = data.get('answer', '')

    user_id = get_user_id(chat_id)

    if not answer_text or len(answer_text) < 3:
        return jsonify({"status": "error", "message": "Ответ слишком короткий"}), 400

    room = rooms.get(int(room_id))
    if not room or room['status'] != 'playing':
        return jsonify({"status": "error", "message": "Комната не найдена"}), 404

    player = next((p for p in players.values() if p['room_id'] == room['id'] and p['user_id'] == user_id), None)
    if not player:
        return jsonify({"status": "error", "message": "Вы не в этой комнате"}), 403

    current = next((r for r in rounds.values() if r['room_id'] == room['id'] and r['round_number'] == room['current_round']), None)
    if not current:
        return jsonify({"status": "error", "message": "Раунд не найден"}), 404

    # Уже отвечал?
    if any(a['round_id'] == current['id'] and a['player_id'] == player['id'] for a in answers.values()):
        return jsonify({"status": "error", "message": "Вы уже ответили"}), 400

    # Мок-оценка (случайная 4-10)
    grade = random.randint(4, 10)
    comments = [
        "Остроумно, но можно лучше!",
        "Отличный выход из ситуации!",
        "Забавно, но не совсем в тему.",
        "Смело! Зал одобрительно кивает.",
        "Кринж-фактор снижен успешно.",
    ]
    comment = random.choice(comments)

    answer_id = len(answers) + 1
    answers[answer_id] = {
        'id': answer_id,
        'round_id': current['id'],
        'player_id': player['id'],
        'answer': answer_text,
        'grade': grade,
        'comment': comment,
    }

    player['total_score'] += grade

    # Все ответили?
    room_players = [p for p in players.values() if p['room_id'] == room['id']]
    round_answers = [a for a in answers.values() if a['round_id'] == current['id']]
    if len(round_answers) >= len(room_players):
        current['status'] = 'finished'

    result = get_room_state(room, user_id)
    result['grade'] = grade
    result['comment'] = comment
    return jsonify(result)


@app.route('/api/duel2/next', methods=['POST'])
def duel2_next():
    data = request.json or {}
    chat_id = data.get('user_id', '')
    room_id = data.get('room_id', '')

    user_id = get_user_id(chat_id)
    room = rooms.get(int(room_id))
    if not room or room['status'] != 'playing':
        return jsonify({"status": "error", "message": "Комната не найдена"}), 404

    if room['creator_id'] != user_id:
        return jsonify({"status": "error", "message": "Только создатель"}), 403

    current = next((r for r in rounds.values() if r['room_id'] == room['id'] and r['round_number'] == room['current_round']), None)
    if current and current['status'] != 'finished':
        return jsonify({"status": "error", "message": "Раунд ещё не закончен"}), 400

    task = random.choice(MOCK_TASKS)
    new_round_num = room['current_round'] + 1
    room['current_round'] = new_round_num

    round_id = len(rounds) + 1
    rounds[round_id] = {
        'id': round_id,
        'room_id': room['id'],
        'task_id': task['id'],
        'round_number': new_round_num,
        'status': 'active',
    }

    return jsonify(get_room_state(room, user_id))


@app.route('/api/duel2/finish', methods=['POST'])
def duel2_finish():
    data = request.json or {}
    chat_id = data.get('user_id', '')
    room_id = data.get('room_id', '')

    user_id = get_user_id(chat_id)
    room = rooms.get(int(room_id))
    if not room:
        return jsonify({"status": "error", "message": "Комната не найдена"}), 404

    if room['creator_id'] != user_id:
        return jsonify({"status": "error", "message": "Только создатель"}), 403

    room['status'] = 'finished'
    current = next((r for r in rounds.values() if r['room_id'] == room['id'] and r['round_number'] == room['current_round']), None)
    if current:
        current['status'] = 'finished'

    return jsonify(get_room_state(room, user_id))


@app.route('/api/duel2/status/<room_id>', methods=['GET'])
def duel2_status(room_id):
    chat_id = request.args.get('user_id', '')
    user_id = get_user_id(chat_id)

    room = rooms.get(int(room_id))
    if not room:
        return jsonify({"status": "error", "message": "Комната не найдена"}), 404

    return jsonify(get_room_state(room, user_id))


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'mode': 'mock'})


@app.route('/api/auth/yandex', methods=['POST'])
def auth_yandex():
    """Мок авторизации — любой user проходит"""
    data = request.json or {}
    code = data.get('code', 'mock')
    user_id = f"mock_{hash(code) % 10000}"
    return jsonify({
        'success': True,
        'user_id': user_id,
        'yandex_id': code,
        'username': f'Player_{code}',
        'email': f'{code}@mock.test',
    })


@app.route('/api/auth/user', methods=['GET'])
def get_user():
    user_id = request.args.get('user_id', '')
    return jsonify({
        'success': True,
        'user': {
            'user_id': user_id,
            'yandex_id': '',
            'username': 'MockUser',
            'email': '',
        }
    })


if __name__ == '__main__':
    print("🎮 Mock DuelAPI v2 server running on http://localhost:5001")
    print("   Set REACT_APP_API_URL=http://localhost:5001/api in frontend")
    app.run(debug=True, host='0.0.0.0', port=5001)
