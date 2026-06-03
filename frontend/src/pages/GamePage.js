import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScore, sendMessage } from '../services/api';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { Helmet } from 'react-helmet-async';
import { reachGoal } from '../services/metrica';
import './GamePage.css';

const GamePage = () => {
  const navigate = useNavigate();
  const [activeUserId, setActiveUserId] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('gameMessages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentButtons, setCurrentButtons] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const initUser = async () => {
      const realUserId = localStorage.getItem('userId');
      const yid = localStorage.getItem('yandexId') || '';
      const isReal = realUserId && yid && !yid.startsWith('guest_') && !yid.startsWith('pseudo_');
      if (isReal) {
        setActiveUserId(realUserId);
        setIsGuest(false);
      } else {
        // Try guest id
        let guestId = localStorage.getItem('guestUserId');
        if (!guestId) {
          try {
            const res = await fetch('/api/guest', { method: 'POST' });
            const data = await res.json();
            if (data.status === 'ok') {
              guestId = String(data.user_id);
              localStorage.setItem('guestUserId', guestId);
            }
          } catch (e) {
            console.error('Failed to create guest:', e);
          }
        }
        setActiveUserId(guestId);
        setIsGuest(true);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (activeUserId) loadScore();
  }, [activeUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save last pair to localStorage
  useEffect(() => {
    if (messages.length >= 2) {
      const lastPair = messages.slice(-2);
      localStorage.setItem('gameMessages', JSON.stringify(lastPair));
    }
  }, [messages]);

  // beforeunload for guests
  useEffect(() => {
    const handler = (e) => {
      if (isGuest && gameStarted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isGuest, gameStarted]);

  const loadScore = async () => {
    try {
      const data = await getScore(activeUserId);
      setScoreData(data);
    } catch (error) {
      console.error('Error loading score:', error);
    }
  };

  const handleButtonClick = async (button) => {
    if (button === 'Начать игру' || button === 'Новая игра') reachGoal('solo_start');
    if (loading) return;

    const previousMessages = messages;
    setLoading(true);
    setGameStarted(true);
    
    // Очищаем кнопки сразу при нажатии
    setCurrentButtons([]);
    new Audio('/sounds/click.mp3').play().catch(() => {});

    // Сообщение пользователя (нажатие кнопки)
    const userMessage = {
      type: 'user',
      text: button.title,
    };

    // Берем только последние 2 сообщения (предыдущая пара) и добавляем новое сообщение пользователя
    const previousPair = messages.slice(-2);
    setMessages([...previousPair, userMessage]);

    try {
      const response = await sendMessage(activeUserId, null, null, button);

      // Ответ игры
      const gameMessage = {
        type: 'game',
        text: response.response.text,
        image: response.response.image,
        buttons: response.response.buttons,
        end_session: response.response.end_session,
      };

      // Убираем лоадер перед добавлением сообщений
      setLoading(false);

      // Сохраняем только последние 2 пары: предыдущая пара + текущая пара
      setMessages([...previousPair, userMessage, gameMessage]);
      new Audio('/sounds/receive.mp3').play().catch(() => {});
      // Сохраняем кнопки для отображения под формой ввода
      setCurrentButtons(gameMessage.buttons || []);
      await loadScore(); reachGoal('solo_round_complete');
      
      if (response.response?.end_session) {
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending button click:', error);
      setLoading(false);
      alert('Ошибка при отправке. Попробуйте еще раз.');
      // Откатываемся к предыдущему состоянию
      setMessages(previousMessages);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    reachGoal('solo_answer');

    const userText = inputText.trim();
    setInputText('');
    const previousMessages = messages;
    setLoading(true);
    
    setGameStarted(true);
    // Очищаем кнопки сразу при отправке текста
    setCurrentButtons([]);
    
    try {
      // Добавляем сообщение пользователя в историю
      const userMessage = {
        type: 'user',
        text: userText
      };
      // Берем только последние 2 сообщения (предыдущая пара) и добавляем новое сообщение пользователя
      const previousPair = messages.slice(-2);
      setMessages([...previousPair, userMessage]);
      new Audio('/sounds/send.mp3').play().catch(() => {});
      
      const response = await sendMessage(activeUserId, userText);
      if (!response.response) {
        setLoading(false);
        setMessages([...previousPair, userMessage, { type: 'game', text: 'Ошибка: нет ответа от сервера', buttons: [] }]);
        return;
      }
      // Добавляем ответ от игры
      const gameMessage = {
        type: 'game',
        text: response.response.text,
        image: response.response.image,
        buttons: response.response.buttons,
        end_session: response.response.end_session
      };

      // Убираем лоадер перед добавлением сообщений
      setLoading(false);

      // Сохраняем только последние 2 пары: предыдущая пара + текущая пара
      setMessages([...previousPair, userMessage, gameMessage]);
      new Audio('/sounds/receive.mp3').play().catch(() => {});
      // Сохраняем кнопки для отображения под формой ввода
      setCurrentButtons(gameMessage.buttons || []);
      await loadScore(); reachGoal('solo_round_complete');
      
      if (response.response?.end_session) {
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setLoading(false);
      alert('Ошибка при отправке сообщения. Попробуйте еще раз.');
      // Откатываемся к предыдущему состоянию
      setMessages(previousMessages);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `https://cringebattle22.roborumba.com/${imagePath}`;
  };

  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingPath, setPendingPath] = useState('/');

  const safeNavigate = (path) => {
    if (isGuest && gameStarted) {
      setPendingPath(path);
      setShowExitModal(true);
    } else {
      navigate(path);
    }
  };

  const handleBack = () => safeNavigate('/');

  return (
    <div className="game-page">
      {showExitModal && (
        <div className="exit-modal-overlay">
          <div className="exit-modal">
            <div className="exit-modal-title">Сохранить результат?</div>
            <div className="exit-modal-text">Если выйдете без сохранения, прогресс потеряется.</div>
            <button className="exit-modal-btn save" onClick={() => {
              navigate('/login');
            }}>Сохранить и войти</button>
            <button className="exit-modal-btn discard" onClick={() => {
              setShowExitModal(false);
              localStorage.removeItem('guestUserId');
              navigate(pendingPath);
            }}>Выйти без сохранения</button>
            <button className="exit-modal-btn cancel" onClick={() => setShowExitModal(false)}>Отмена</button>
          </div>
        </div>
      )}
      <AppHeader backTo="/" onBack={handleBack} rightButtons={[{ label: '📖', onClick: () => safeNavigate('/rules') }, { label: '👤', onClick: () => safeNavigate('/profile') }]} />
      <Helmet>
        <title>Играть — Бой с кринжем | Игра с Алисой</title>
        <meta name="description" content="Попадай в неловкие ситуации и выходи из них с блеском! Одиночная игра с AI-судьёй." />
      </Helmet>

      <div className="game-content">
        <div className="game-chat-container">
          <div className="game-chat">
            {loading && messages.length === 0 && (
              <div className="loading-message">Загрузка...</div>
            )}
            
            {!loading && messages.length === 0 && (
              <div className="message-wrapper game-message">
                <div className="message-avatar game-avatar">
                  🎮
                </div>
                <div className="message-container">
                  <div className="game-message-bubble">
                    Напишите ваше сообщение чтобы продолжить игру
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message-wrapper ${message.type === 'user' ? 'user-message' : 'game-message'}`}
              >
                {message.type === 'user' ? (
                  <>
                    <div className="user-message-bubble">
                      {message.text}
                    </div>
                    <div className="message-avatar user-avatar">
                      👤
                    </div>
                  </>
                ) : (
                  <>
                    <div className="message-avatar game-avatar">
                      🎮
                    </div>
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
                        {message.buttons && message.buttons.length > 0 && (
                          <div className="inline-buttons">
                            {message.buttons.map((btn, bi) => (
                              <button key={bi} className="inline-button" onClick={() => handleButtonClick(btn)} disabled={loading}>
                                {btn.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {loading && messages.length > 0 && (
              <div className="message-wrapper game-message">
                <div className="message-avatar game-avatar">
                  🎮
                </div>
                <div className="message-container">
                  <div className="game-message-bubble loading-bubble">
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
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
        {isGuest && (
          <div className="game-guest-buttons">
            <button className="game-guest-btn register" onClick={() => navigate('/login')}>Зарегистрироваться</button>
            <button className="game-guest-btn duel" onClick={() => navigate('/duel')}>⚔️ Онлайн дуэль</button>
          </div>
        )}
        {!isGuest && (
          <div className="game-guest-buttons">
            <button className="game-guest-btn duel" onClick={() => navigate('/duel')}>⚔️ Онлайн дуэль</button>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
};

export default GamePage;

