import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScore } from '../services/api';
import './ProfilePage.css';

const ProfilePage = () => {
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    loadScore();
  }, [userId, navigate]);

  const loadScore = async () => {
    try {
      const data = await getScore(userId);
      setScoreData(data);
    } catch (error) {
      console.error('Error loading score:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/');
  };

  const handleSubscribe = () => {
    // Здесь будет интеграция с платежной системой
    alert('Функция оплаты подписки будет реализована позже');
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="profile-title">Личный кабинет</h1>
          <button className="logout-button" onClick={handleLogout}>
            Выйти
          </button>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2 className="section-title">Статистика</h2>
            {loading ? (
              <div className="loading">Загрузка...</div>
            ) : scoreData ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-value">{scoreData.rating || 0}</div>
                  <div className="stat-label">Рейтинг</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-value">{scoreData.score || 0}</div>
                  <div className="stat-label">Очки</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-value">{scoreData.rounds || 0}</div>
                  <div className="stat-label">Раундов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⚡</div>
                  <div className="stat-value stress">{scoreData.stress_level || 0}</div>
                  <div className="stat-label">Уровень стресса</div>
                </div>
              </div>
            ) : (
              <div className="error">Ошибка загрузки данных</div>
            )}
          </div>

          <div className="profile-section">
            <h2 className="section-title">Подписка</h2>
            <div className="subscription-card">
              <div className="subscription-info">
                <h3 className="subscription-title">Премиум подписка</h3>
                <p className="subscription-description">
                  Получите доступ к дополнительным функциям и эксклюзивному контенту
                </p>
                <ul className="subscription-features">
                  <li>✓ Неограниченное количество раундов</li>
                  <li>✓ Эксклюзивные ситуации</li>
                  <li>✓ Приоритетная поддержка</li>
                  <li>✓ Расширенная статистика</li>
                </ul>
              </div>
              <button className="subscribe-button" onClick={handleSubscribe}>
                Оформить подписку
              </button>
            </div>
          </div>

          <div className="profile-actions">
            <button className="action-button" onClick={() => navigate('/game')}>
              Продолжить игру
            </button>
            <button className="action-button secondary" onClick={() => navigate('/')}>
              На главную
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

