import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reachGoal } from '../services/metrica';
import { authWithYandex } from '../services/api';
import './LoginPage.css';

const YANDEX_OAUTH_URL = 'https://oauth.yandex.ru/authorize';
const YANDEX_CLIENT_ID = process.env.REACT_APP_YANDEX_CLIENT_ID || '99cba34d48204d18a6f5ed537ba0f693';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const yid = localStorage.getItem('yandexId') || '';
    const isPseudo = !yid || yid.startsWith('guest_') || yid.startsWith('pseudo_') || (userId || '').startsWith('web_');
    if (userId && !isPseudo) {
      navigate('/');
      return;
    }
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
      const authResponse = await authWithYandex(code);
      if (authResponse.success) {
        reachGoal('login');
        localStorage.setItem('userId', authResponse.user_id);
        localStorage.setItem('username', authResponse.username || '');
        localStorage.setItem('email', authResponse.email || '');
        localStorage.setItem('yandexId', authResponse.yandex_id || '');
        window.history.replaceState({}, document.title, '/login');
        navigate('/');
      } else {
        setError(authResponse.error || 'Ошибка авторизации');
      }
    } catch (err) {
      console.error('Yandex OAuth error:', err);
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const handleYandexLogin = () => {
    const redirectUri = `${window.location.origin}/login`;
    const yandexAuthUrl = `${YANDEX_OAUTH_URL}?response_type=code&client_id=${YANDEX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = yandexAuthUrl;
  };

  const handleOtpLogin = async () => {
    if (!otpCode || otpCode.length !== 6) return;
    setOtpLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        reachGoal('login');
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('username', data.nickname);
        navigate('/');
      } else {
        setError(data.message || 'Неверный код');
      }
    } catch {
      setError('Ошибка подключения');
    }
    setOtpLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="home-logo">
          <img src="/logo.jpg" alt="Бой с кринжем" className="logo-img" />
          <h1 className="login-title">Бой с кринжем</h1>
        </div>

        {error && (
          <div className="login-error">{error}</div>
        )}

        {!showOtp ? (
          <div className="login-buttons">
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

            <button
              type="button"
              className="otp-login-button"
              onClick={() => { setShowOtp(true); setError(''); }}
            >
              <span className="otp-login-icon">🗣</span>
              <span>Войти по коду из колонки</span>
            </button>
          </div>
        ) : (
          <div className="otp-section">
            <h3 className="otp-subtitle">Вход по коду из колонки Алиса</h3>
            <p className="otp-hint">Запустите игру «Бой с кринжем» на колонке, скажите Алисе «Дай код» и введите его здесь</p>
            <div className="otp-form">
              <input
                type="text"
                className="otp-input"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleOtpLogin()}
                autoFocus
              />
              <button
                className="otp-button"
                onClick={handleOtpLogin}
                disabled={otpLoading || otpCode.length !== 6}
              >
                {otpLoading ? '...' : '→'}
              </button>
            </div>
          </div>
        )}

        <button
          className="login-back-button"
          onClick={() => navigate('/')}
          disabled={loading}
        >
          ← На главную
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
