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
YANDEX_CLIENT_ID = os.environ.get('YANDEX_CLIENT_ID', '')
YANDEX_CLIENT_SECRET = os.environ.get('YANDEX_CLIENT_SECRET', '')


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
            return jsonify({
                'success': True,
                'user': {
                    'user_id': user.user_id,
                    'yandex_id': user.yandex_id,
                    'username': user.username,
                    'email': user.email,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None
                }
            }), 200
        except User.DoesNotExist:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
            
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


@app.route('/api/health', methods=['GET'])
def health():
    """
    Health check endpoint
    """
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

