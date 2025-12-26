import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      navigate('/game');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="home-page">
      <div className="home-container">
        <h1 className="home-title">Бой с кринжем</h1>
        <p className="home-subtitle">
          Попадай в неловкие ситуации и выходи из них с блеском!
          Чем остроумнее ответ, тем больше очков заработаешь.
        </p>
        <button className="home-button" onClick={handleStart}>
          Начать игру
        </button>
        <div className="home-features">
          <div className="feature">
            <span className="feature-icon">💬</span>
            <span>Интерактивный чат</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🏆</span>
            <span>Рейтинг игроков</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <span>Остроумные ответы</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

