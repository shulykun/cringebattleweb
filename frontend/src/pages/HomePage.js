import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

import { reachGoal } from '../services/metrica';

const HomePage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || localStorage.getItem('nickname') || '';

  useEffect(() => { reachGoal('page_view'); }, []);

  return (
    <div className="home-page">
      <div className="home-container">
        {/* Profile link */}
        {userId && (
          <div className="home-profile">
            <span className="profile-greeting">👋 {username}</span>
            <button className="profile-link" onClick={() => { reachGoal('click_profile'); navigate('/profile'); }}>
              Профиль →
            </button>
          </div>
        )}

        {/* Logo */}
        <div className="home-logo">
          <img src="/logo.jpg" alt="Бой с кринжем" className="logo-img" />
          <h1 className="home-title">Бой с кринжем</h1>
          <p className="home-tagline">Попадай в неловкие ситуации и выходи из них с блеском!</p>
        </div>

        {/* Buttons */}
        <div className="home-buttons">
          <button className="home-button solo" onClick={() => { reachGoal('click_solo'); navigate('/game'); }}>
            <span className="button-icon">🎮</span>
            <span className="button-text">
              <span className="button-title">Играть одному</span>
              <span className="button-desc">Тренируйся против AI</span>
            </span>
          </button>
          <button className="home-button duel" onClick={() => { reachGoal('click_duel'); navigate('/duel'); }}>
            <span className="button-icon">⚔️</span>
            <span className="button-text">
              <span className="button-title">Онлайн дуэль</span>
              <span className="button-desc">Сразись с друзьями</span>
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="home-stats">
          <div className="stat-item">
            <span className="stat-value">50,000+</span>
            <span className="stat-label">игроков</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">100+</span>
            <span className="stat-label">ситуаций</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">2</span>
            <span className="stat-label">режима</span>
          </div>
        </div>

        {/* Leaderboard link */}
        <button className="home-button leaderboard-link" onClick={() => { reachGoal('click_leaderboard'); navigate('/leaderboard'); }}>
          <span className="button-icon">🏆</span>
          <span className="button-text">
            <span className="button-title">Таблица лидеров</span>
            <span className="button-desc">Рейтинг игроков</span>
          </span>
        </button>
        <button className="home-button rules-link" onClick={() => { reachGoal('click_rules'); navigate('/rules'); }}>
          <span className="button-icon">📖</span>
          <span className="button-text">
            <span className="button-title">Правила игры</span>
            <span className="button-desc">Как играть и команды</span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default HomePage;
