import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userId.trim()) {
      localStorage.setItem('userId', userId.trim());
      navigate('/game');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">Авторизация</h1>
        <p className="login-subtitle">Введите ваш ID для входа в игру</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Введите ваш ID"
            className="login-input"
            required
          />
          <button type="submit" className="login-button">
            Войти
          </button>
        </form>
        <button 
          className="login-back-button"
          onClick={() => navigate('/')}
        >
          ← На главную
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

