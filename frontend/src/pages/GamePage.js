import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScore, sendMessage } from '../services/api';
import './GamePage.css';

const GamePage = () => {
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const [gameMessage, setGameMessage] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    loadScore();
    startGame();
  }, [userId, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameMessage]);

  const loadScore = async () => {
    try {
      const data = await getScore(userId);
      setScoreData(data);
    } catch (error) {
      console.error('Error loading score:', error);
    }
  };

  const startGame = async () => {
    setLoading(true);
    try {
      const response = await sendMessage(userId, 'Играть');
      setGameMessage(response.response);
      await loadScore();
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Ошибка при запуске игры. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = async (button) => {
    setLoading(true);
    try {
      const response = await sendMessage(userId, null, null, button);
      setGameMessage(response.response);
      await loadScore();
      
      if (response.response?.end_session) {
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending button click:', error);
      alert('Ошибка при отправке. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    setLoading(true);
    try {
      const response = await sendMessage(userId, inputText.trim());
      setGameMessage(response.response);
      setInputText('');
      await loadScore();
      
      if (response.response?.end_session) {
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Ошибка при отправке сообщения. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `https://cringebattle22.roborumba.com/${imagePath}`;
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="header-button" onClick={() => navigate('/profile')}>
          Профиль
        </button>
        <h1 className="game-title">Бой с кринжем</h1>
        <button className="header-button" onClick={() => navigate('/')}>
          Главная
        </button>
      </div>

      <div className="game-content">
        <div className="game-chat-container">
          <div className="game-chat">
            {loading && !gameMessage && (
              <div className="loading-message">Загрузка...</div>
            )}
            
            {gameMessage && (
              <div className="message-container">
                {gameMessage.image && (
                  <div className="message-image">
                    <img 
                      src={getImageUrl(gameMessage.image)} 
                      alt="Game scene"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="message-text">
                  {gameMessage.text}
                </div>

                {gameMessage.buttons && gameMessage.buttons.length > 0 && (
                  <div className="message-buttons">
                    {gameMessage.buttons.map((button, index) => (
                      <button
                        key={index}
                        className="game-button"
                        onClick={() => handleButtonClick(button)}
                        disabled={loading}
                      >
                        {button.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleTextSubmit} className="chat-input-form">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Введите ваш ответ..."
              className="chat-input"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="chat-send-button"
              disabled={loading || !inputText.trim()}
            >
              Отправить
            </button>
          </form>
        </div>

        <div className="score-panel">
          <h2 className="score-title">Статистика</h2>
          {scoreData ? (
            <div className="score-content">
              <div className="score-item">
                <span className="score-label">Очки:</span>
                <span className="score-value">{scoreData.score || 0}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Рейтинг:</span>
                <span className="score-value">{scoreData.rating || 0}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Раундов:</span>
                <span className="score-value">{scoreData.rounds || 0}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Уровень стресса:</span>
                <span className="score-value stress">{scoreData.stress_level || 0}</span>
              </div>
            </div>
          ) : (
            <div className="score-loading">Загрузка...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;

