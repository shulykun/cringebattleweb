from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import uuid
from datetime import datetime
from peewee import *

# База данных (SQLite по умолчанию, можно изменить через DATABASE_URL)
database = SqliteDatabase(os.environ.get('DATABASE_URL', 'users.db'))


class BaseModel(Model):
    class Meta:
        database = database


class User(BaseModel):
    user_id = CharField(primary_key=True, max_length=36)
    yandex_id = CharField(unique=True, max_length=255)
    username = CharField(max_length=255)
    email = CharField(max_length=255, null=True)
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    class Meta:
        db_table = 'users'
    
    def save(self, *args, **kwargs):
        # Автоматически обновляем updated_at при сохранении
        self.updated_at = datetime.now()
        if not self.created_at:
            self.created_at = datetime.now()
        return super(User, self).save(*args, **kwargs)


# Создаем таблицы
database.create_tables([User], safe=True)

app = Flask(__name__)
CORS(app)

# API endpoints игрового движка
SCORE_API_URL = "https://cringebattle22.roborumba.com/web_score"
MESSAGE_API_URL = "https://cringebattle22.roborumba.com/web_chat"

# Яндекс OAuth endpoints
YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token"
YANDEX_INFO_URL = "https://login.yandex.ru/info"

# Переменные окружения
YANDEX_CLIENT_ID = os.environ.get('YANDEX_CLIENT_ID', '99cba34d48204d18a6f5ed537ba0f693')
YANDEX_CLIENT_SECRET = os.environ.get('YANDEX_CLIENT_SECRET', '9f79c9aeb5d64ca887f8098afd563c9c')


@app.route('/api/auth/yandex', methods=['POST'])
def auth_yandex():
    """
    Авторизация пользователя через Яндекс OAuth.
    Обрабатывает обмен authorization code на access_token и авторизацию пользователя.
    """
    try:
        data = request.json or {}
        code = data.get('code')
        access_token = data.get('access_token')
        
        # Если передан code, обмениваем на access_token
        if code:
            token_response = requests.post(
                YANDEX_TOKEN_URL,
                data={
                    'grant_type': 'authorization_code',
                    'code': code,
                    'client_id': YANDEX_CLIENT_ID,
                    'client_secret': YANDEX_CLIENT_SECRET
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if token_response.status_code != 200:
                return jsonify({
                    'success': False,
                    'error': 'Failed to exchange code for token'
                }), 401
            
            token_data = token_response.json()
            access_token = token_data.get('access_token')
            
            if not access_token:
                return jsonify({
                    'success': False,
                    'error': 'No access token in response'
                }), 401
        
        # Проверяем access_token
        if not access_token:
            return jsonify({
                'success': False,
                'error': 'code or access_token is required'
            }), 400
        
        # Получаем информацию о пользователе из Яндекс
        user_info_response = requests.get(
            YANDEX_INFO_URL,
            headers={'Authorization': f'OAuth {access_token}'}
        )
        
        if user_info_response.status_code != 200:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired token'
            }), 401
        
        yandex_user_data = user_info_response.json()
        yandex_id = str(yandex_user_data.get('id'))
        username = yandex_user_data.get('display_name') or yandex_user_data.get('login') or 'User'
        email = yandex_user_data.get('default_email') or (yandex_user_data.get('emails', [])[0] if yandex_user_data.get('emails') else '')
        
        if not yandex_id:
            return jsonify({
                'success': False,
                'error': 'Failed to get user ID from Yandex'
            }), 401
        
        # Проверяем, существует ли пользователь с таким yandex_id
        try:
            user = User.get(User.yandex_id == yandex_id)
            # Обновляем информацию пользователя
            user.username = username
            user.email = email
            user.save()  # updated_at будет обновлен автоматически в методе save()
            user_id = user.user_id
        except User.DoesNotExist:
            # Если пользователь не найден, создаем нового
            user_id = str(uuid.uuid4())
            User.create(
                user_id=user_id,
                yandex_id=yandex_id,
                username=username,
                email=email
                # created_at и updated_at будут установлены автоматически в методе save()
            )
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'yandex_id': yandex_id,
            'username': username,
            'email': email
        }), 200
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': f'Yandex API error: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/auth/user', methods=['GET'])
def get_user():
    """
    Получить информацию о пользователе по user_id
    """
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        try:
            user = User.get(User.user_id == user_id)
        except User.DoesNotExist:
            # Fallback: автоматически создаём пользователя
            user = User.create(
                user_id=user_id,
                yandex_id=f'guest_{user_id}',
                username=f'Player_{user_id[:6]}'
            )

        return jsonify({
            'success': True,
            'user': {
                'user_id': user.user_id,
                'yandex_id': user.yandex_id,
                'username': user.username,
                'email': user.email or '',
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'updated_at': user.updated_at.isoformat() if user.updated_at else None
            }
        }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/score', methods=['POST'])
def get_score():
    """
    Прокси для получения статистики игрока
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        response = requests.post(SCORE_API_URL, json={'user_id': user_id})
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Game API error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/message', methods=['POST'])
def send_message():
    """
    Прокси для отправки сообщений в игру
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        request_data = data.get('request')
        
        if not user_id or not request_data:
            return jsonify({'error': 'user_id and request are required'}), 400
        
        payload = {
            'user_id': user_id,
            'request': request_data
        }
        
        # Если есть callback (нажатие кнопки), добавляем meta
        if 'callback' in request_data:
            payload['meta'] = {}
        
        response = requests.post(MESSAGE_API_URL, json=payload)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Game API error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


import random

# ── Duel2 — игровая логика (in-memory) ──────────
duel_rooms = {}        # room_id -> dict
duel_players = {}      # player_id -> dict
duel_rounds = {}       # round_id -> dict
duel_answers = {}      # answer_id -> dict

DUEL_TASKS = [
    {"id": 1, "description": "Ты случайно назвал учителя «мамой» на уроке. Что скажешь?"},
    {"id": 2, "description": "Ты пришёл на свидание, а там — твой бывший/бывшая с новым партнёром. Твои действия?"},
    {"id": 3, "description": "Ты отправил скриншот сплетен тому, о ком писал. Реакция?"},
    {"id": 4, "description": "На собеседовании ты назвал компанию конкурентом. Как выкрутишься?"},
    {"id": 5, "description": "Ты лайкнул фото трёхлетней давности у человека, который тебе нравится. Ваш ход?"},
    {"id": 6, "description": "Ты спел песню в караоке, забыв что микрофон был выключен. Что дальше?"},
    {"id": 7, "description": "Коллега показывает фото своего ребёнка, а ты говоришь «какой... интересный». Спасай ситуацию!"},
    {"id": 8, "description": "Ты пожал руку человеку, который просто тянулся поздороваться с кем-то за тобой. Ваши действия?"},
]


def _is_yandex_user(user_id):
    """Проверяет, залогинен ли пользователь через Яндекс."""
    try:
        user = User.get(User.user_id == user_id)
        return not user.yandex_id.startswith('guest_')
    except User.DoesNotExist:
        return False


def _get_duel_room_state(room, user_id):
    """Собрать состояние комнаты дуэли."""
    room_players = [p for p in duel_players.values() if p['room_id'] == room['id']]
    players_data = []
    for p in room_players:
        players_data.append({
            'user_id': p['user_id'],
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

    if room['status'] == 'playing':
        current = next((r for r in duel_rounds.values()
                        if r['room_id'] == room['id'] and r['round_number'] == room['current_round']), None)
        if current:
            task = next((t for t in DUEL_TASKS if t['id'] == current['task_id']), None)
            result['task'] = task['description'] if task else 'Задача не найдена'

            round_answers = [a for a in duel_answers.values() if a['round_id'] == current['id']]
            player_record = next((p for p in room_players if p['user_id'] == user_id), None)
            result['answered'] = player_record and any(a['player_id'] == player_record['id'] for a in round_answers)

            result['answers'] = []
            for a in round_answers:
                p = duel_players.get(a['player_id'], {})
                result['answers'].append({
                    'nickname': p.get('nickname', '?'),
                    'answer': a['answer'],
                    'grade': a['grade'],
                    'comment': a.get('comment', ''),
                })

            result['current_round_data'] = {'all_answered': len(round_answers) >= len(room_players)}

    room_rounds = sorted(
        [r for r in duel_rounds.values() if r['room_id'] == room['id']],
        key=lambda r: r['round_number']
    )
    rounds_data = []
    for r in room_rounds:
        ra = []
        for a in duel_answers.values():
            if a['round_id'] == r['id']:
                p = duel_players.get(a['player_id'], {})
                ra.append({
                    'nickname': p.get('nickname', '?'),
                    'answer': a['answer'],
                    'grade': a['grade'],
                    'comment': a.get('comment', ''),
                })
        rounds_data.append({'round_number': r['round_number'], 'status': r['status'], 'answers': ra})
    result['rounds'] = rounds_data
    return result


@app.route('/api/duel2/create', methods=['POST'])
def duel2_create():
    """Создание комнаты дуэли. Только для залогиненных через Яндекс."""
    data = request.json or {}
    user_id = data.get('user_id', '')
    nickname = data.get('nickname', '')
    max_players = min(max(data.get('max_players', 2), 2), 10)

    if not user_id:
        return jsonify({'status': 'error', 'message': 'Необходима авторизация через Яндекс'}), 401

    if not _is_yandex_user(user_id):
        return jsonify({'status': 'error', 'message': 'Для создания дуэли нужна авторизация через Яндекс'}), 403

    code = str(random.randint(100, 999))
    while any(r['code'] == code and r['status'] != 'finished' for r in duel_rooms.values()):
        code = str(random.randint(100, 999))

    room_id = len(duel_rooms) + 1
    room = {
        'id': room_id, 'code': code, 'creator_id': user_id,
        'status': 'waiting', 'max_players': max_players, 'current_round': 0,
    }
    duel_rooms[room_id] = room

    player_id = len(duel_players) + 1
    duel_players[player_id] = {
        'id': player_id, 'room_id': room_id, 'user_id': user_id,
        'nickname': nickname, 'total_score': 0,
    }

    return jsonify(_get_duel_room_state(room, user_id))


@app.route('/api/duel2/accept', methods=['POST'])
def duel2_accept():
    """Присоединение к дуэли. Гости могут заходить под любым именем."""
    data = request.json or {}
    user_id = data.get('user_id', '')
    code = str(data.get('code', '')).strip()
    nickname = data.get('nickname', '')

    if not code:
        return jsonify({'status': 'error', 'message': 'Введите код комнаты'}), 400

    # Генерируем guest_id если пользователь не залогинен
    if not user_id:
        user_id = f'guest_{uuid.uuid4().hex[:8]}'

    room = next((r for r in duel_rooms.values() if r['code'] == code and r['status'] != 'finished'), None)
    if not room:
        return jsonify({'status': 'error', 'message': 'Код не найден'}), 404

    existing = next((p for p in duel_players.values() if p['room_id'] == room['id'] and p['user_id'] == user_id), None)
    if existing:
        return jsonify(_get_duel_room_state(room, user_id))

    room_players = [p for p in duel_players.values() if p['room_id'] == room['id']]
    if len(room_players) >= room['max_players']:
        return jsonify({'status': 'error', 'message': 'Комната полна'}), 400

    if room['status'] != 'waiting':
        return jsonify({'status': 'error', 'message': 'Игра уже началась'}), 400

    player_id = len(duel_players) + 1
    duel_players[player_id] = {
        'id': player_id, 'room_id': room['id'], 'user_id': user_id,
        'nickname': nickname or f'Гость {player_id}', 'total_score': 0,
    }

    return jsonify(_get_duel_room_state(room, user_id))


@app.route('/api/duel2/start', methods=['POST'])
def duel2_start():
    data = request.json or {}
    user_id = data.get('user_id', '')

    room = next((r for r in duel_rooms.values() if r['creator_id'] == user_id and r['status'] == 'waiting'), None)
    if not room:
        return jsonify({'status': 'error', 'message': 'Нет ожидающих комнат'}), 404

    room_players = [p for p in duel_players.values() if p['room_id'] == room['id']]
    if len(room_players) < 2:
        return jsonify({'status': 'error', 'message': 'Нужно минимум 2 игрока'}), 400

    task = random.choice(DUEL_TASKS)
    room['status'] = 'playing'
    room['current_round'] = 1

    round_id = len(duel_rounds) + 1
    duel_rounds[round_id] = {
        'id': round_id, 'room_id': room['id'], 'task_id': task['id'],
        'round_number': 1, 'status': 'active',
    }

    return jsonify(_get_duel_room_state(room, user_id))


@app.route('/api/duel2/answer', methods=['POST'])
def duel2_answer():
    data = request.json or {}
    user_id = data.get('user_id', '')
    room_id = data.get('room_id', '')
    answer_text = data.get('answer', '')

    if not answer_text or len(answer_text) < 3:
        return jsonify({'status': 'error', 'message': 'Ответ слишком короткий'}), 400

    room = duel_rooms.get(int(room_id)) if room_id else None
    if not room or room['status'] != 'playing':
        return jsonify({'status': 'error', 'message': 'Комната не найдена'}), 404

    player = next((p for p in duel_players.values() if p['room_id'] == room['id'] and p['user_id'] == user_id), None)
    if not player:
        return jsonify({'status': 'error', 'message': 'Вы не в этой комнате'}), 403

    current = next((r for r in duel_rounds.values() if r['room_id'] == room['id'] and r['round_number'] == room['current_round']), None)
    if not current:
        return jsonify({'status': 'error', 'message': 'Раунд не найден'}), 404

    if any(a['round_id'] == current['id'] and a['player_id'] == player['id'] for a in duel_answers.values()):
        return jsonify({'status': 'error', 'message': 'Вы уже ответили'}), 400

    grade = random.randint(4, 10)
    comments = [
        "Остроумно, но можно лучше!",
        "Отличный выход из ситуации!",
        "Забавно, но не совсем в тему.",
        "Смело! Зал одобрительно кивает.",
        "Кринж-фактор снижен успешно.",
    ]
    comment = random.choice(comments)

    answer_id = len(duel_answers) + 1
    duel_answers[answer_id] = {
        'id': answer_id, 'round_id': current['id'],
        'player_id': player['id'], 'answer': answer_text,
        'grade': grade, 'comment': comment,
    }
    player['total_score'] += grade

    room_players = [p for p in duel_players.values() if p['room_id'] == room['id']]
    round_answers = [a for a in duel_answers.values() if a['round_id'] == current['id']]
    if len(round_answers) >= len(room_players):
        current['status'] = 'finished'

    result = _get_duel_room_state(room, user_id)
    result['grade'] = grade
    result['comment'] = comment
    return jsonify(result)


@app.route('/api/duel2/next', methods=['POST'])
def duel2_next():
    data = request.json or {}
    user_id = data.get('user_id', '')
    room_id = data.get('room_id', '')

    room = duel_rooms.get(int(room_id)) if room_id else None
    if not room or room['status'] != 'playing':
        return jsonify({'status': 'error', 'message': 'Комната не найдена'}), 404

    if room['creator_id'] != user_id:
        return jsonify({'status': 'error', 'message': 'Только создатель'}), 403

    current = next((r for r in duel_rounds.values() if r['room_id'] == room['id'] and r['round_number'] == room['current_round']), None)
    if current and current['status'] != 'finished':
        return jsonify({'status': 'error', 'message': 'Раунд ещё не закончен'}), 400

    task = random.choice(DUEL_TASKS)
    new_round_num = room['current_round'] + 1
    room['current_round'] = new_round_num

    round_id = len(duel_rounds) + 1
    duel_rounds[round_id] = {
        'id': round_id, 'room_id': room['id'], 'task_id': task['id'],
        'round_number': new_round_num, 'status': 'active',
    }

    return jsonify(_get_duel_room_state(room, user_id))


@app.route('/api/duel2/finish', methods=['POST'])
def duel2_finish():
    data = request.json or {}
    user_id = data.get('user_id', '')
    room_id = data.get('room_id', '')

    room = duel_rooms.get(int(room_id)) if room_id else None
    if not room:
        return jsonify({'status': 'error', 'message': 'Комната не найдена'}), 404

    if room['creator_id'] != user_id:
        return jsonify({'status': 'error', 'message': 'Только создатель'}), 403

    room['status'] = 'finished'
    current = next((r for r in duel_rounds.values() if r['room_id'] == room['id'] and r['round_number'] == room['current_round']), None)
    if current:
        current['status'] = 'finished'

    return jsonify(_get_duel_room_state(room, user_id))


@app.route('/api/duel2/status/<room_id>', methods=['GET'])
def duel2_status(room_id):
    user_id = request.args.get('user_id', '')
    room = duel_rooms.get(int(room_id)) if room_id else None
    if not room:
        return jsonify({'status': 'error', 'message': 'Комната не найдена'}), 404
    return jsonify(_get_duel_room_state(room, user_id))


@app.route('/api/health', methods=['GET'])
def health():
    """
    Health check endpoint
    """
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 4998))
    app.run(debug=True, host='0.0.0.0', port=port)

