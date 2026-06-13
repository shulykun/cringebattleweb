import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import AppFooter from '../components/AppFooter';


import { reachGoal, trackPageView } from '../services/metrica';

const HomePage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || localStorage.getItem('nickname') || '';
  const ambientRef = useRef(null);

  const [demoSituation, setDemoSituation] = useState('');
  const [demoAnswer, setDemoAnswer] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);

  const situations = [
    "Ты возвращаешься со школы и у дома видишь машину отца. Решаешь открыть дверь, чтобы поздороваться, но открыв дверь понимаешь что внутри сидят совершенно незнакомые люди. Как ты отреагируешь?",
    "Ты играл в шахматы с ребёнком и перед игрой сказал что если он у тебя выиграет, то сто процентов купишь ему квартиру. Все вокруг это видели. Но ребёнок оказался вундеркиндом и ты ему проиграл. Что будешь делать?",
    "Ты профессор биологии и вот однажды нашёл новый вид червяка и рассказал об этом всем. Однако на исследованиях выяснилось, что это мармеладный червяк. Что будешь делать?",
    "Ты решил удивить друзей и залезть к ним в окно первого этажа в костюме Деда Мороза. Залезаешь, кричишь «Хо-хо-хо!», а там сидит незнакомая семья и ужинает. Ты ошибся окном. Что скажешь?",
    "В кафе ты взял трубочку и начал пить чужой коктейль — он стоял на краю соседнего стола и выглядел точно как твой. Хозяин смотрит на тебя с открытым ртом. Что скажешь?",
  ];

  useEffect(() => {
    setDemoSituation(situations[Math.floor(Math.random() * situations.length)]);
  }, []);

  const handleDemoSubmit = async () => {
    if (!demoAnswer.trim() || demoAnswer.trim().length < 2) return;
    setDemoLoading(true);
    reachGoal('demo_answer');
    trackPageView('/virtual/demo-answer');
    try {
      const res = await fetch('/api/demo-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: demoSituation, answer: demoAnswer })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setDemoResult({ score: data.score, comment: data.comment });
      }
    } catch (e) {
      setDemoResult({ score: 7, comment: 'Неплохо, но можно креативнее!' });
    }
    setDemoLoading(false);
  };

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
          <button className="home-button solo" onClick={() => { reachGoal('click_solo'); navigate('/voice'); }}>
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
        {/* Demo try block */}
        <div className="demo-block">
          <h2 className="demo-title">⚡ Попробуй прямо сейчас</h2>
          <div className="demo-situation">
            <span className="demo-situation-label">Ситуация:</span>
            <p className="demo-situation-text">{demoSituation}</p>
          </div>
          {!demoResult ? (
            <div className="demo-input-wrap">
              <textarea
                className="demo-input"
                placeholder="Как выкрутишься?"
                value={demoAnswer}
                onChange={(e) => setDemoAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDemoSubmit(); }}}
                maxLength={200}
                disabled={demoLoading}
                rows={2}
              />
              <button
                className="demo-submit-small"
                onClick={handleDemoSubmit}
                disabled={demoLoading || !demoAnswer.trim() || demoAnswer.trim().length < 2}
              >
                {demoLoading ? <span className="demo-btn-spinner"/> : '→'}
              </button>
            </div>
          ) : (
            <div className="demo-result">
              <div className="demo-score">
                <span className="demo-score-value">{demoResult.score}</span>
                <span className="demo-score-label">/ 10</span>
              </div>
              <p className="demo-comment">{demoResult.comment}</p>
              <div className="demo-actions">
                <button className="demo-play" onClick={() => { reachGoal('demo_to_game'); navigate('/voice'); }}>
                  💬 Играть дальше
                </button>
              </div>
            </div>
          )}
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
      <AppFooter />
    </div>
  );
};

export default HomePage;
