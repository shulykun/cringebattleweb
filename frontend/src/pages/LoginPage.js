import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authWithYandex } from '../services/api';
import './LoginPage.css';

const YANDEX_OAUTH_URL = 'https://oauth.yandex.ru/authorize';
const YANDEX_CLIENT_ID = process.env.REACT_APP_YANDEX_CLIENT_ID || 'YOUR_CLIENT_ID';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, есть ли уже авторизованный пользователь
    const userId = localStorage.getItem('userId');
    if (userId) {
      navigate('/game');
      return;
    }

    // Проверяем, есть ли токен в URL (callback от Яндекс OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      handleYandexCallback(code);
    }
  }, [navigate]);

  const handleYandexCallback = async (code) => {
    setLoading(true);
    setError('');

    try {
      // Отправляем code на backend для обмена на access_token и получения user_id
      // Backend должен обработать обмен code на token и авторизацию
      const authResponse = await authWithYandex(code);
      
      if (authResponse.success) {
        localStorage.setItem('userId', authResponse.user_id);
        localStorage.setItem('username', authResponse.username || '');
        localStorage.setItem('email', authResponse.email || '');
        
        // Очищаем URL от параметров
        window.history.replaceState({}, document.title, '/login');
        navigate('/game');
      } else {
        setError(authResponse.error || 'Ошибка авторизации');
      }
    } catch (err) {
      console.error('Yandex OAuth error:', err);
      setError('Ошибка подключения к серверу. Убедитесь, что backend запущен.');
    } finally {
      setLoading(false);
    }
  };

  const handleYandexLogin = () => {
    // Redirect URI указывает на адрес фронтенда /login, где будет обработан code
    const redirectUri = `${window.location.origin}/login`;
    const yandexAuthUrl = `${YANDEX_OAUTH_URL}?response_type=code&client_id=${YANDEX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    window.location.href = yandexAuthUrl;
  };

  const handleTestLogin = () => {
    const testId = 'test_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('userId', testId);
    localStorage.setItem('username', 'TestPlayer');
    navigate('/duel');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">Авторизация</h1>
        <p className="login-subtitle">
          Войдите через Яндекс для начала игры
        </p>

        {error && (
          <div className="login-error">{error}</div>
        )}

        <div className="login-form">
          <button
            type="button"
            className="yandex-login-button"
            onClick={handleYandexLogin}
            disabled={loading}
          >
            {loading ? (
              <span>Авторизация...</span>
            ) : (
              <>
                <svg className="yandex-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.344 7.5h-2.5c-.276 0-.5.224-.5.5v8.5c0 .276.224.5.5.5h2.5c.276 0 .5-.224.5-.5V8c0-.276-.224-.5-.5-.5zM12 7.5c-2.481 0-4.5 2.019-4.5 4.5s2.019 4.5 4.5 4.5 4.5-2.019 4.5-4.5S14.481 7.5 12 7.5z"/>
                </svg>
                <span>Войти через Яндекс</span>
              </>
            )}
          </button>
        </div>

        <button 
          className="login-back-button"
          onClick={() => navigate('/')}
          disabled={loading}
        >
          ← На главную
        </button>

        <button
          className="login-back-button"
          onClick={handleTestLogin}
          style={{marginTop: '10px', color: '#888'}}
        >
          🧪 Тестовый вход (без Яндекс)
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

