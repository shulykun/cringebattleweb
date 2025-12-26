import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScore, sendMessage } from '../services/api';
import './GamePage.css';

const GamePage = () => {
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const [messages, setMessages] = useState([]); // История сообщений
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
  }, [messages]);

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
      // Добавляем сообщение от игры в историю
      setMessages([{
        type: 'game',
        text: response.response.text,
        image: response.response.image,
        buttons: response.response.buttons,
        end_session: response.response.end_session
      }]);
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
      // Добавляем сообщение пользователя (нажатие кнопки)
      const userMessage = {
        type: 'user',
        text: button.title
      };
      setMessages(prev => [...prev, userMessage]);
      
      const response = await sendMessage(userId, null, null, button);
      // Добавляем ответ от игры
      setMessages(prev => [...prev, {
        type: 'game',
        text: response.response.text,
        image: response.response.image,
        buttons: response.response.buttons,
        end_session: response.response.end_session
      }]);
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

    const userText = inputText.trim();
    setInputText('');
    setLoading(true);
    
    try {
      // Добавляем сообщение пользователя в историю
      const userMessage = {
        type: 'user',
        text: userText
      };
      setMessages(prev => [...prev, userMessage]);
      
      const response = await sendMessage(userId, userText);
      // Добавляем ответ от игры
      setMessages(prev => [...prev, {
        type: 'game',
        text: response.response.text,
        image: response.response.image,
        buttons: response.response.buttons,
        end_session: response.response.end_session
      }]);
      await loadScore();
      
      if (response.response?.end_session) {
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Ошибка при отправке сообщения. Попробуйте еще раз.');
      // Удаляем последнее сообщение пользователя при ошибке
      setMessages(prev => prev.slice(0, -1));
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
            {loading && messages.length === 0 && (
              <div className="loading-message">Загрузка...</div>
            )}
            
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message-wrapper ${message.type === 'user' ? 'user-message' : 'game-message'}`}
              >
                {message.type === 'user' ? (
                  <div className="user-message-bubble">
                    {message.text}
                  </div>
                ) : (
                  <div className="message-container">
                    {message.image && (
                      <div className="message-image">
                        <img 
                          src={getImageUrl(message.image)} 
                          alt="Game scene"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="game-message-bubble">
                      {message.text}
                    </div>

                    {message.buttons && message.buttons.length > 0 && (
                      <div className="message-buttons">
                        {message.buttons.map((button, btnIndex) => (
                          <button
                            key={btnIndex}
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
              </div>
            ))}

            {loading && messages.length > 0 && (
              <div className="loading-indicator">...</div>
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

