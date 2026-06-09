import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import './HomePage.css';
import './HomePageV2.css';
import { Helmet } from 'react-helmet-async';
import { reachGoal, trackPageView } from '../services/metrica';

const HomePageV2 = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || localStorage.getItem('nickname') || '';
  const [situation, setSituation] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [situationLoading, setSituationLoading] = useState(true);

  useEffect(() => { 
    reachGoal('page_view_v2');
    trackPageView('/v2');
  }, []);

  const situations = [
    "Ты приходишь в школу, открываешь рюкзак и достаёшь вместо учебника игрушечного котёнка, завязанного в полотенце",
    "Ты случайно отправил фото с котом начальнику вместо коллеги по рабочему чату",
    "Ты позвонил маме и пожаловался на начальника, но это был начальник",
    "Ты помахал человеку, а он оказался незнакомым и тоже помахал обратно",
    "Ты назвал учителя мамой на полном серьёзе",
    "Ты пришёл на свидание, а оказалось что это собеседование",
  ];

  useEffect(() => {
    setSituation(situations[Math.floor(Math.random() * situations.length)]);
    setSituationLoading(false);
  }, []);

  const fetchSituation = () => {
    setResult(null);
    setAnswer('');
    setSituation(situations[Math.floor(Math.random() * situations.length)]);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || answer.trim().length < 2) return;
    setLoading(true);
    reachGoal('demo_answer');
    try {
      const res = await fetch('/api/demo-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation, answer })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setResult({ score: data.score, comment: data.comment });
        trackPageView('/virtual/demo-result');
      }
    } catch (e) {
      setResult({ score: 7, comment: 'Неплохо, но можно креативнее!' });
    }
    setLoading(false);
  };

  return (
    <div className="home-page">
      <div className="home-container">
        {userId && (
          <div className="home-profile">
            <span className="profile-greeting">👋 {username}</span>
            <button className="profile-link" onClick={() => navigate('/profile')}>
              Профиль →
            </button>
          </div>
        )}

        <div className="home-logo">
          <img src="/logo.jpg" alt="Бой с кринжем" className="logo-img" />
          <h1 className="home-title">Бой с кринжем</h1>
          <p className="home-tagline">Попадай в неловкие ситуации и выходи из них с блеском!</p>
        </div>

        {/* DEMO TRY BLOCK */}
        <div className="demo-block">
          <h2 className="demo-title">⚡ Попробуй прямо сейчас</h2>
          
          {situationLoading ? (
            <div className="demo-situation-loading">
              <span className="demo-spinner">🎯</span> Загружаем ситуацию...
            </div>
          ) : (
            <>
              <div className="demo-situation">
                <span className="demo-situation-label">Ситуация:</span>
                <p className="demo-situation-text">{situation}</p>
              </div>

              {!result ? (
                <>
                  <input
                    type="text"
                    className="demo-input"
                    placeholder="Как выкрутишься?"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    maxLength={200}
                    disabled={loading}
                  />
                  <button 
                    className="demo-submit" 
                    onClick={handleSubmit}
                    disabled={loading || !answer.trim() || answer.trim().length < 2}
                  >
                    {loading ? 'Оцениваю...' : '🎯 Ответить'}
                  </button>
                </>
              ) : (
                <div className="demo-result">
                  <div className="demo-score">
                    <span className="demo-score-value">{result.score}</span>
                    <span className="demo-score-label">/ 10</span>
                  </div>
                  <p className="demo-comment">{result.comment}</p>
                  <div className="demo-actions">
                    <button className="demo-retry" onClick={fetchSituation}>
                      🔄 Другая ситуация
                    </button>
                    <button className="demo-play" onClick={() => { reachGoal('demo_to_game'); navigate('/game'); }}>
                      🎮 Играть
                    </button>
                    <button className="demo-duel" onClick={() => { reachGoal('demo_to_duel'); navigate('/duel'); }}>
                      ⚔️ Дуэль
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Main buttons */}
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

        <button className="home-button leaderboard-link" onClick={() => navigate('/leaderboard')}>
          <span className="button-icon">🏆</span>
          <span className="button-text">
            <span className="button-title">Таблица лидеров</span>
            <span className="button-desc">Рейтинг игроков</span>
          </span>
        </button>

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

        <button className="home-button rules-link" onClick={() => navigate('/rules')}>
          <span className="button-icon">📖</span>
          <span className="button-text">
            <span className="button-title">Правила игры</span>
            <span className="button-desc">Как играть и команды</span>
          </span>
        </button>
        <button className="home-button feedback-link" onClick={() => navigate('/feedback')}>
          <span className="button-icon">✉️</span>
          <span className="button-text">
            <span className="button-title">Обратная связь</span>
            <span className="button-desc">Отзыв, баг или идея</span>
          </span>
        </button>
      </div>
      <AppFooter />
    </div>
  );
};

export default HomePageV2;
