import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

import { reachGoal } from '../services/metrica';

const HomePage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || localStorage.getItem('nickname') || '';
  const ambientRef = useRef(null);

  useEffect(() => { reachGoal('page_view'); }, []);

  // Play ambient chord on first user interaction
  useEffect(() => {
    const playAmbient = () => {
      if (localStorage.getItem('voiceOn') === 'true' && ambientRef.current && ambientRef.current.paused) {
        ambientRef.current.volume = 0.3;
        ambientRef.current.play().catch(() => {});
      }
      document.removeEventListener('click', playAmbient);
    };
    document.addEventListener('click', playAmbient);
    return () => document.removeEventListener('click', playAmbient);
  }, []);

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

        {/* Promo features */}
        <div className="home-features">
          <div className="feature-card">
            <span className="feature-icon">😱</span>
            <span className="feature-title">Представь что ты попал в кринж</span>
            <span className="feature-desc">Тебя застукали за странным занятием. Или забыл имя человека, с которым здороваешься уже год. Ну ты понял..</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">💡</span>
            <span className="feature-title">Выкручивайся</span>
            <span className="feature-desc">Каждая ситуация — вызов. Придумай самый остроумный, нелепый или гениальный выход и получи максимум баллов за оригинальность</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">⚔️</span>
            <span className="feature-title">Дуэль с друзьями</span>
            <span className="feature-desc">Создай комнату, поделись с другом. Вы оба в одной неловкой ситуации. Кто выкрутится лучше — забирает очки</span>
          </div>
        </div>
        <button className="home-button rules-link" onClick={() => { reachGoal('click_rules'); navigate('/rules'); }}>
          <span className="button-icon">📖</span>
          <span className="button-text">
            <span className="button-title">Правила игры</span>
            <span className="button-desc">Как играть и команды</span>
          </span>
        </button>
        <button className="home-button feedback-link" onClick={() => { reachGoal('click_feedback'); navigate('/feedback'); }}>
          <span className="button-icon">✉️</span>
          <span className="button-text">
            <span className="button-title">Обратная связь</span>
            <span className="button-desc">Отзыв, баг или идея</span>
          </span>
        </button>
        <audio ref={ambientRef} src="/sounds/ambient.mp3?v=2" preload="auto" loop />
        <button className="mute-btn" onClick={() => {
          if (ambientRef.current) {
            ambientRef.current.paused ? ambientRef.current.play().catch(()=>{}) : ambientRef.current.pause();
          }
        }} style={{position:'fixed',bottom:12,right:12,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'50%',width:40,height:40,color:'#fff',fontSize:18,cursor:'pointer',zIndex:999}}>🔇</button>
      </div>
    </div>
  );
};

export default HomePage;
