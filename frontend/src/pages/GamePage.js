import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem('voiceOn') === 'true');
  const musicRef = useRef(null);

  const speak = useCallback((text) => {
    if (!voiceOn) { console.log('TTS: voice off'); return; }
    const clean = text.replace(/[*#_\[\]()]/g, '');
    console.log('TTS: speaking', clean.substring(0, 50));
    // Pause ambient music
    const ambient = document.querySelector('audio[loop]') || musicRef.current;
    if (ambient) { ambient.volume = 0.05; }
    const resumeAmbient = () => { if (ambient) { ambient.volume = 0.3; } };
    // Try Web Speech API first (only if Russian voice exists)
    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      const ruVoice = voices.find(v => v.lang.startsWith('ru'));
      if (ruVoice) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = 'ru-RU'; u.rate = 1.3; u.pitch = 1.0;
        u.voice = ruVoice;
        u.onend = resumeAmbient;
        u.onerror = resumeAmbient;
        window.speechSynthesis.speak(u);
        return;
      }
    }
    // Fallback: server-side TTS for Safari
    console.log('TTS: using server-side gTTS');
    const audio = new Audio();
    audio.onended = resumeAmbient;
    audio.onerror = resumeAmbient;
    fetch('/api/tts', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text: clean})
    }).then(r => r.blob()).then(blob => {
      audio.src = URL.createObjectURL(blob);
      audio.play().catch(() => {});
    }).catch(() => resumeAmbient());
  }, [voiceOn]);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('gameMessages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [scorePulse, setScorePulse] = useState(false);
  const prevScore = useRef(0);
  const [inputText, setInputText] = useState('');
  const [currentButtons, setCurrentButtons] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const prevMsgCount = useRef(0);
  useEffect(() => {
    prevMsgCount.current = messages.length;
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
      if (data && data.score !== prevScore.current) {
        setScorePulse(true);
        setTimeout(() => setScorePulse(false), 500);
        prevScore.current = data.score;
      }
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
    // Start music on first interaction
    if (voiceOn && musicRef.current && musicRef.current.paused) {
      musicRef.current.volume = 0.3;
      musicRef.current.play().catch(() => {});
    }
    
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
        grade_data: response.response.grade_data || null,
      };

      // Убираем лоадер перед добавлением сообщений
      setLoading(false);

      // Сохраняем только последние 2 пары: предыдущая пара + текущая пара
      setMessages([...previousPair, userMessage, gameMessage]);
      new Audio('/sounds/receive.mp3').play().catch(() => {});
      speak(gameMessage.tts || gameMessage.text);
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
    // Start music on first interaction
    if (voiceOn && musicRef.current && musicRef.current.paused) {
      musicRef.current.volume = 0.3;
      musicRef.current.play().catch(() => {});
    }
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
        end_session: response.response.end_session,
        grade_data: response.response.grade_data || null,
      };

      // Убираем лоадер перед добавлением сообщений
      setLoading(false);

      // Сохраняем только последние 2 пары: предыдущая пара + текущая пара
      setMessages([...previousPair, userMessage, gameMessage]);
      new Audio('/sounds/receive.mp3').play().catch(() => {});
      speak(gameMessage.tts || gameMessage.text);
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
  const [showMenu, setShowMenu] = useState(false);
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
      <audio ref={musicRef} src="/sounds/ambient.mp3?v=2" preload="auto" loop />
      <button onClick={() => { const m = musicRef.current; const v = !voiceOn; setVoiceOn(v); localStorage.setItem('voiceOn', v); if (!v) { window.speechSynthesis?.cancel(); if (m) m.pause(); } else { if (m && m.paused) { m.volume = 0.3; m.play().catch(()=>{}); } } }} style={{display:'none'}}>{voiceOn ? '🔊' : '🔇'}</button>
      {showExitModal && (
        <div className="exit-modal-overlay">
          <div className="exit-modal">
            <div className="exit-modal-title">Сохранить результат?</div>
            <div className="exit-modal-text">Войдите через Яндекс, чтобы сохранить очки и рейтинг.</div>
            <button className="exit-modal-btn save" onClick={() => {
              navigate('/login');
            }}>Войти через Яндекс</button>
            <button className="exit-modal-btn discard" onClick={() => {
              setShowExitModal(false);
              localStorage.removeItem('guestUserId');
              navigate(pendingPath);
            }}>Выйти без сохранения</button>
            <button className="exit-modal-btn cancel" onClick={() => setShowExitModal(false)}>Отмена</button>
          </div>
        </div>
      )}
      <AppHeader backTo="/" onBack={handleBack} rightButtons={[{ label: '☰', onClick: () => setShowMenu(!showMenu) }]} />
      {showMenu && (
        <div className="game-menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="game-menu" onClick={(e) => e.stopPropagation()}>
            <button className="game-menu-item" onClick={() => { setShowMenu(false); navigate('/leaderboard'); }}>🏆 Рейтинг</button>
            <button className="game-menu-item" onClick={() => { setShowMenu(false); setInputText('подсказка'); }}>💡 Подсказка</button>
            <button className="game-menu-item" onClick={() => { setShowMenu(false); navigate('/rules'); }}>📖 Правила</button>
            <button className="game-menu-item" onClick={() => { setShowMenu(false); setInputText('добавить свою ситуацию'); }}>✍️ Добавить кринж</button>
            <button className="game-menu-item" onClick={() => { setShowMenu(false); navigate('/duel'); }}>⚔️ Онлайн дуэль</button>
            <button className="game-menu-item" onClick={() => { setShowMenu(false); navigate('/profile'); }}>👤 Профиль</button>
          </div>
        </div>
      )}
      <Helmet>
        <title>Играть — Бой с кринжем | Игра с Алисой</title>
        <meta name="description" content="Попадай в неловкие ситуации и выходи из них с блеском! Одиночная игра с AI-судьёй." />
      </Helmet>

      <div className="game-content">
        {/* Desktop sidebar stats */}
        {scoreData && (
          <div className="game-sidebar">
            <div className="score-panel">
              <h2 className="score-title">Статистика</h2>
              <div className="score-content">
                <div className="score-item">
                  <span className="score-label">Очки</span>
                  <span className="score-value">{scoreData.score || 0}</span>
                </div>
                <div className="score-item">
                  <span className="score-label">Рейтинг</span>
                  <span className="score-value">{scoreData.rating || 0}</span>
                </div>
                <div className="score-item">
                  <span className="score-label">Раундов</span>
                  <span className="score-value">{scoreData.rounds || 0}</span>
                </div>
                <div className="score-item">
                  <span className="score-label">Стресс</span>
                  <span className="score-value stress">{Math.max(0, scoreData.stress_level || 0)}</span>
                </div>
              </div>
              <div className="sidebar-status">{isGuest ? '👻 Гость' : '✅ Авторизован'}</div>
            </div>
          </div>
        )}
        {/* Mobile stats bar (hidden on desktop) */}
        {scoreData && (
          <div className="stats-bar mobile-only" onClick={() => setShowStats(true)}>
            <span>Очки: <b className={scorePulse ? 'pulse' : ''}>{scoreData?.score || 0}</b></span>
            <span>Рейтинг: <b className={scorePulse ? 'pulse' : ''}>{scoreData?.rating || 0}</b></span>
            <span>Стресс: <b className={scorePulse ? 'pulse' : ''}>{Math.max(0, scoreData?.stress_level || 0)}</b></span>
            <span className="guest-badge">{isGuest ? '👻 Гость' : '✅'}</span>
          </div>
        )}
        {/* Mobile drawer */}
        {showStats && (
          <div className="stats-overlay" onClick={() => setShowStats(false)}>
            <div className="stats-drawer" onClick={(e) => e.stopPropagation()}>
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
                      <span className="score-label">Стресс:</span>
                      <span className="score-value stress">{Math.max(0, scoreData.stress_level || 0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="score-loading">Загрузка...</div>
                )}
              </div>
            </div>
          </div>
        )}
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
                    👋 Привет! Это игра «Бой с Кринжем». Я буду предлагать неловкие ситуации, а ты будешь придумывать из них выход. Самые остроумные ответы получают максимум очков. Напиши «давай играть» и мы начнем!
                  </div>
                  <div className="inline-buttons">
                    <button className="inline-button" onClick={() => { setInputText('давай играть'); document.querySelector('.chat-input').focus(); }}>🎮 Играть</button>
                    <button className="inline-button" onClick={() => { navigate('/duel'); }}>👥 Играть компанией</button>
                    <button className="inline-button" onClick={() => { navigate('/rules'); }}>📖 Правила</button>
                    <button className="inline-button" onClick={() => { navigate('/leaderboard'); }}>🏆 Рейтинг</button>
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
                      
                      {message.grade_data && (() => {
                        const g = message.grade_data.score;
                        const c = message.grade_data.cringe;
                        const emoji = g >= 9 ? '🔥' : g >= 7 ? '😎' : g >= 5 ? '😅' : g >= 3 ? '😬' : '💀';
                        const reaction = g >= 9 ? 'Мастер выхода!' : g >= 7 ? 'Неплохо!' : g >= 5 ? 'Пройдет...' : g >= 3 ? 'Кринж детектед' : 'Полный провал!';
                        const cringeEmoji = c >= 8 ? '🤦‍♂️🤦‍♂️🤦‍♂️' : c >= 5 ? '🤦‍♂️' : c >= 3 ? '😬' : '😎';
                        const scoreClass = g >= 8 ? 'grade-high' : g >= 5 ? 'grade-mid' : 'grade-low';
                        return (
                          <div className={`grade-card ${g >= 8 ? 'grade-card-fire' : ''}`}>
                            <div className="grade-emoji">{emoji}</div>
                            <div className="grade-score-row">
                              <div className="grade-score">
                                <span className={`grade-number ${scoreClass}`}>{g}</span>
                                <span className="grade-of">/10</span>
                              </div>
                              <div className="grade-reaction">{reaction}</div>
                            </div>
                            <div className="grade-cringe-row">
                              <span className="cringe-emoji">{cringeEmoji}</span>
                              <div className="cringe-bar">
                                <div className="cringe-fill" style={{width: `${c * 10}%`}}></div>
                              </div>
                              <span className="cringe-value">{c}/10</span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="game-message-bubble">
                        {message.text}
                      </div>
                      {message.buttons && message.buttons.length > 0 && (
                        <div className="message-buttons">
                          {message.buttons.map((btn, bi) => (
                            <button key={bi} className="message-action-btn" onClick={() => handleButtonClick(btn)} disabled={loading}>
                              {btn.title}
                            </button>
                          ))}
                        </div>
                      )}
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
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(e); }}}
              placeholder="Введите ваш ответ..."
              className="chat-input"
              disabled={loading}
              rows={1}
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
            <button
              type="submit"
              className="chat-send-button"
              disabled={loading || !inputText.trim()}
            >
              →
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default GamePage;

