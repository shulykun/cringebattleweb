import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AppFooter.css';

const AppFooter = () => {
  const navigate = useNavigate();

  return (
    <div className="app-footer">
      <div className="footer-links">
        <button className="footer-link" onClick={() => navigate('/game')}>🎮 Игра</button>
        <button className="footer-link" onClick={() => navigate('/duel')}>⚔️ Дуэль</button>
        <button className="footer-link" onClick={() => navigate('/leaderboard')}>🏆 Лидерборд</button>
        <button className="footer-link" onClick={() => navigate('/rules')}>Правила</button>
        <button className="footer-link" onClick={() => navigate('/feedback')}>Обратная связь</button>
        <button className="footer-link" onClick={() => navigate('/install')}>Установить</button>
      </div>
      <div className="alice-badge">
        <a href="https://dialogs.yandex.ru/store/skills/78318e89-boj-s-krinzhe?utm_source=site&utm_medium=badge&utm_campaign=v1&utm_term=d1" target="_blank" rel="noopener noreferrer">
          <img alt="Алиса это умеет" src="https://dialogs.s3.yandex.net/badges/v1-term1.svg" />
        </a>
      </div>
    </div>
  );
};

export default AppFooter;
