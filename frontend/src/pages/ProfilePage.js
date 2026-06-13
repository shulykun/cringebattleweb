import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScore } from '../services/api';
import { reachGoal } from '../services/metrica';
import './ProfilePage.css';

const ProfilePage = () => {
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) { navigate('/login'); return; }
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

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Logo */}
        <div className="home-logo">
          <img src="/logo.jpg" alt="Бой с кринжем" className="logo-img" />
          <h1 className="profile-title">Профиль</h1>
          <p className="profile-nickname">{localStorage.getItem('username') || 'Игрок'}</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="profile-loading">Загрузка...</div>
        ) : scoreData ? (
          <div className="profile-stats">
            <div className="profile-stat-card">
              <div className="profile-stat-value">{scoreData.rating || 0}</div>
              <div className="profile-stat-label">🏆 Рейтинг</div>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-value">{scoreData.score || 0}</div>
              <div className="profile-stat-label">⭐ Очки</div>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-value">{scoreData.rounds || 0}</div>
              <div className="profile-stat-label">🎯 Раундов</div>
            </div>
            <div className="profile-stat-card">
              <div className="profile-stat-value stress">{scoreData.stress_level || 0}</div>
              <div className="profile-stat-label">⚡ Стресс</div>
            </div>
          </div>
        ) : (
          <div className="profile-loading">Ошибка загрузки</div>
        )}

        {/* Buttons */}
        <div className="profile-buttons">
          <button className="profile-btn solo" onClick={() => { reachGoal('click_solo'); navigate('/game'); }}>
            <span className="profile-btn-icon">🎮</span>
            <span className="profile-btn-text">Играть</span>
          </button>
          <button className="profile-btn duel" onClick={() => { reachGoal('click_duel'); navigate('/duel'); }}>
            <span className="profile-btn-icon">⚔️</span>
            <span className="profile-btn-text">Дуэль</span>
          </button>
          <button className="profile-btn leaderboard" onClick={() => { reachGoal('click_leaderboard'); navigate('/leaderboard'); }}>
            <span className="profile-btn-icon">🏆</span>
            <span className="profile-btn-text">Рейтинг</span>
          </button>
          <button className="profile-btn myduels" onClick={() => { reachGoal('click_my_duels'); navigate('/my-duels'); }}>
            <span className="profile-btn-icon">⚔️</span>
            <span className="profile-btn-text">Мои дуэли</span>
          </button>
        </div>

        {/* Logout */}
        <button className="profile-home" onClick={() => navigate('/')}>← На главную</button>
        <button className="profile-logout" onClick={handleLogout}>Выйти</button>
      </div>
    </div>
  );
};

        <div className="alice-badge" style={{textAlign:"center",padding:"12px 0 0"}}><a href="https://dialogs.yandex.ru/store/skills/78318e89-boj-s-krinzhe?utm_source=site&utm_medium=badge&utm_campaign=v1&utm_term=d1" target="_blank" rel="noopener noreferrer"><img alt="Алиса это умеет" src="https://dialogs.s3.yandex.net/badges/v1-term1.svg" /></a></div>
export default ProfilePage;
