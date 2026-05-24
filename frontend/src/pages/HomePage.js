import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || localStorage.getItem('nickname') || '';

  return (
    <div className="home-page">
      <div className="home-container">
        {/* Profile link */}
        {userId && (
          <div className="home-profile">
            <span className="profile-greeting">👋 {username}</span>
            <button className="profile-link" onClick={() => navigate('/profile')}>
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
          <button className="home-button solo" onClick={() => navigate('/game')}>
            <span className="button-icon">🎮</span>
            <span className="button-text">
              <span className="button-title">Играть одному</span>
              <span className="button-desc">Тренируйся против AI</span>
            </span>
          </button>
          <button className="home-button duel" onClick={() => navigate('/duel')}>
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
      </div>
    </div>
  );
};

export default HomePage;
