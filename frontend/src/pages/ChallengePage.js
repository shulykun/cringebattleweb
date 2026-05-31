import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { duel2Create, duel2Accept, duel2Start, duel2Answer, duel2Next, duel2Finish, duel2Message, duel2Status, duel2Rematch } from '../services/api';
import { reachGoal } from '../services/metrica';
import './ChallengePage.css';

const POLL_INTERVAL = 3000;

const ChallengePage = () => {
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const isYandexUser = localStorage.getItem('yandexId') && !localStorage.getItem('yandexId').startsWith('guest_') && !localStorage.getItem('yandexId').startsWith('pseudo_');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pollRef = useRef(null);
  const screenRef = useRef('menu');

  const [screen, _setScreen] = useState('menu');
  const [restoring, setRestoring] = useState(false);
  const [room, setRoom] = useState(null);
  const [roomId, setRoomId] = useState(() => localStorage.getItem('duelRoomId') || '');
  const [joinCode, setJoinCode] = useState('');
  const [creatorNick, setCreatorNick] = useState('');
  const [roomFull, setRoomFull] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [nickname, setNickname] = useState(() => localStorage.getItem('username') || localStorage.getItem('nickname') || '');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [answer, setAnswer] = useState('');
  const [lastGrade, setLastGrade] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [lastSeenMsgId, setLastSeenMsgId] = useState(() => parseInt(localStorage.getItem('lastSeenMsgId') || '0'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setScreen = (s) => {
    screenRef.current = s;
    _setScreen(s);
  };

  const saveRoomId = (id, code) => {
    setRoomId(String(id));
    localStorage.setItem('duelRoomId', String(id));
    if (code) localStorage.setItem('duelRoomCode', code);
  };

  const clearRoomId = () => {
    setRoomId('');
    localStorage.removeItem('duelRoomId');
    localStorage.removeItem('duelRoomCode');
  };

  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    // Если есть сохранённая комната — сначала восстановить
    if (roomId) {
      setRestoring(true);
      restoreRoom(roomId).then(() => setRestoring(false)).catch(() => {
        // Если не получилось по roomId — попробовать по коду
        const savedCode = localStorage.getItem('duelRoomCode');
        if (savedCode) {
          setJoinCode(savedCode);
          setScreen('join_by_link');
          fetch(`/api/duel2/info/${savedCode}`)
            .then(r => r.json())
            .then(d => {
              if (d.creator_nickname) setCreatorNick(d.creator_nickname);
              if (d.status === 'error') { clearRoomId(); setRestoring(false); }
              else setRestoring(false);
            })
            .catch(() => { clearRoomId(); setRestoring(false); });
        } else {
          clearRoomId();
          setRestoring(false);
        }
      });
      return;
    }
    // Если есть код из ссылки — экран ввода ника
    if (codeFromUrl) {
      setJoinCode(codeFromUrl);
      setScreen('join_by_link');
      fetch(`/api/duel2/info/${codeFromUrl}`)
        .then(r => r.json())
        .then(d => {
          if (d.status === 'error') { setRoomNotFound(true); return; }
          if (d.creator_nickname) setCreatorNick(d.creator_nickname);
          if (d.players_count >= d.max_players) setRoomFull(true);
        })
        .catch(() => { setRoomNotFound(true); });
      return;
    }
    if (!userId) {
      navigate('/login');
      return;
    }
    return () => stopPolling();
  }, [userId, navigate]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback((id) => {
    stopPolling();
    pollRef.current = setInterval(() => pollRoom(id), POLL_INTERVAL);
  }, []);

  const handleSendMessage = async () => {
    if (!chatText.trim() || !roomId) return;
    try {
      await duel2Message(userId, roomId, chatText.trim());
      setChatText('');
    } catch (e) {
      console.error('Message error:', e);
    }
  };

  const unreadCount = (room?.messages || []).filter(m => m.id > lastSeenMsgId && m.nickname !== (localStorage.getItem('username') || '')).length;

  const closeChat = () => {
    setShowChat(false);
    const msgs = room?.messages || [];
    if (msgs.length) {
      const lastId = msgs[msgs.length - 1].id;
      setLastSeenMsgId(lastId);
      localStorage.setItem('lastSeenMsgId', String(lastId));
    }
  };

  const updateRoom = (data) => {
    if (data.status === 'success' || data.room_id) {
      setRoom(data);
      return true;
    }
    return false;
  };

  const restoreRoom = async (id) => {
    try {
      const data = await duel2Status(userId, id);
      if (data.status === 'error') { clearRoomId(); return; }
      updateRoom(data);
      if (data.room_status === 'waiting') {
        setScreen('lobby');
        startPolling(id);
      } else if (data.room_status === 'playing') {
        const allAnswered = data.current_round_data?.all_answered;
        setScreen(allAnswered ? 'round_result' : 'playing');
        startPolling(id);
      } else if (data.room_status === 'finished') {
        setScreen('final');
      } else {
        clearRoomId();
      }
    } catch (e) {
      clearRoomId();
    }
  };

  const pollRoom = async (id) => {
    try {
      const data = await duel2Status(userId, id);
      if (data.status === 'error') return;
      updateRoom(data);
      // Старт игры — все игроки переходят из лобби
      if (data.room_status === 'playing' && screenRef.current === 'lobby') {
        setScreen('playing');
      }
      // Новый раунд — сбрасываем на playing
      if (data.room_status === 'playing' && !data.current_round_data?.all_answered && screenRef.current === 'round_result') {
        setAnswer('');
        setLastGrade(null);
        setScreen('playing');
      }
      // Все ответили — переключаем на результат раунда
      if (data.room_status === 'playing' && data.current_round_data?.all_answered && screenRef.current === 'playing') {
        setScreen('round_result');
      }
      // Игра завершена
      if (data.room_status === 'finished' && screenRef.current !== 'final') {
        setScreen('final');
        stopPolling();
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
  };

  // ── Создать комнату ──────────────────────────
  const handleCreate = async () => {
    setLoading(true); setError('');
    reachGoal('duel_create');
    if (nickname) { localStorage.setItem('nickname', nickname); localStorage.setItem('username', nickname); }
    try {
      const data = await duel2Create(userId, nickname, maxPlayers);
      if (data.status === 'error') { setError(data.message); setLoading(false); return; }
      updateRoom(data); saveRoomId(data.room_id, data.code);
      setScreen('lobby'); startPolling(data.room_id);
    } catch (e) { setError('Ошибка при создании комнаты'); }
    setLoading(false);
  };

  // ── Войти по коду ────────────────────────────
  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true); setError('');
    reachGoal('duel_join');
    if (nickname) { localStorage.setItem('nickname', nickname); localStorage.setItem('username', nickname); }
    try {
      // Если не авторизован — pseudo-login по нику
      let uid = userId;
      if (!uid) {
        const res = await fetch('/api/auth/pseudo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: nickname.trim() })
        });
        const loginData = await res.json();
        if (loginData.status === 'ok') {
          reachGoal('pseudo_login');
          uid = loginData.user_id;
          localStorage.setItem('userId', uid);
          localStorage.setItem('username', loginData.nickname);
        } else {
          setError(loginData.message || 'Ошибка входа');
          setLoading(false); return;
        }
      }
      const data = await duel2Accept(uid, joinCode.trim(), nickname);
      if (data.status === 'error') { setError(data.message); setLoading(false); return; }
      updateRoom(data); saveRoomId(data.room_id, data.code);
      if (data.room_status === 'waiting') { setScreen('lobby'); startPolling(data.room_id); }
      else if (data.room_status === 'playing') { setScreen('playing'); startPolling(data.room_id); }
    } catch (e) { setError('Ошибка при подключении'); }
    setLoading(false);
  };

  // ── Начать игру ──────────────────────────────
  const handleStart = async () => {
    setLoading(true); setError('');
    reachGoal('duel_start');
    try {
      const data = await duel2Start(userId, room.room_id);
      if (data.status === 'error') { setError(data.message); setLoading(false); return; }
      updateRoom(data); setScreen('playing');
    } catch (e) { setError('Ошибка при старте'); }
    setLoading(false);
  };

  // ── Ответить ─────────────────────────────────
  const handleAnswer = async () => {
    if (!answer.trim() || answer.trim().length < 3) return;
    setLoading(true); setError('');
    reachGoal('duel_answer');
    try {
      const data = await duel2Answer(userId, room.room_id, answer.trim());
      if (data.status === 'error') { setError(data.message); setLoading(false); return; }
      setLastGrade(data.grade); updateRoom(data);
      if (data.current_round_data?.all_answered) { setScreen('round_result'); }
    } catch (e) { setError('Ошибка при отправке ответа'); }
    setLoading(false);
  };

  // ── Следующий раунд ──────────────────────────
  const handleNextRound = async () => {
    setLoading(true); setError(''); setAnswer(''); setLastGrade(null);
    reachGoal('duel_round_complete');
    try {
      const data = await duel2Next(userId, room.room_id);
      if (data.status === 'error') { setError(data.message); setLoading(false); return; }
      updateRoom(data); setScreen('playing');
    } catch (e) { setError('Ошибка'); }
    setLoading(false);
  };

  // ── Завершить игру ───────────────────────────
  const handleFinish = async () => {
    setLoading(true);
    reachGoal('duel_finish');
    try {
      const data = await duel2Finish(userId, room.room_id);
      updateRoom(data); setScreen('final'); stopPolling();
    } catch (e) { setError('Ошибка'); }
    setLoading(false);
  };

  // ── В меню ───────────────────────────────────
  const handleBackToMenu = () => {
    stopPolling(); setRoom(null); setAnswer(''); setLastGrade(null); setError('');
    if (room?.room_status === 'finished') clearRoomId();
    setScreen('menu');
  };

  const handleLeaveDuel = () => {
    if (window.confirm('Выйти из дуэли?')) {
      stopPolling(); setRoom(null); setAnswer(''); setLastGrade(null); setError('');
      clearRoomId(); setScreen('menu');
    }
  };

  // ── Ссылка-приглашение ───────────────────────
  const getInviteLink = () => {
    if (!room?.code) return '';
    return `${window.location.origin}/duel?code=${room.code}`;
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch(e) { console.error('Copy failed:', e); }
    document.body.removeChild(ta);
  };

  const copyLink = () => {
    copyToClipboard(getInviteLink());
    setLinkCopied(true);
    reachGoal('duel_invite_copy');
    setTimeout(() => setLinkCopied(false), 2000);
  };
  const copyCode = () => {
    copyToClipboard(room?.code || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const isCreator = room?.players?.some(p => p.is_creator && (p.user_id == userId || p.chat_id === userId)) || false;

  const currentRoundAnswers = room?.answers || [];
  const hasAnswered = room?.answered;

  // ── РЕНДЕР ───────────────────────────────────

  // Chat overlay — renders on top of any screen
  const chatOverlay = showChat && room ? (
    <>
      <div className="chat-overlay-bg" onClick={closeChat} />
      <div className="chat-panel">
        <div className="chat-panel-header">
          <span>💬 Чат</span>
          <button className="chat-close" onClick={closeChat}>✕</button>
        </div>
        <div className="chat-panel-messages">
          {(room?.messages || []).map((m, i) => (
            <div key={i} className={`chat-msg ${m.nickname === (localStorage.getItem('username') || '') ? 'mine' : ''}`}>
              <span className="chat-msg-nick">{m.nickname}</span>
              <span className="chat-msg-text">{m.text}</span>
              <span className="chat-msg-time">{m.time}</span>
            </div>
          ))}
          {!(room?.messages?.length) && <div className="chat-empty">Пока тихо... 🤫</div>}
        </div>
        <div className="chat-panel-input">
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="Сообщение..."
            maxLength={200}
          />
          <button onClick={handleSendMessage} disabled={!chatText.trim()} type="button">➤</button>
        </div>
      </div>
    </>
  ) : null;

  const chatBell = (
    <button className="chat-bell" onClick={() => setShowChat(!showChat)}>
      🔔
      {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
    </button>
  );

  if (restoring) {
    return (
      <div className="challenge-page">
        <div className="challenge-content" style={{alignItems:'center',justifyContent:'center',flex:1}}>
          <div className="waiting-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    );
  }

  if (screen === 'menu') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <div className="header-center"><img src="/logo.jpg" alt="" className="header-logo" /><span className="header-center-text">Дуэль</span></div>
          <button className="header-button" onClick={() => navigate('/')}>←</button>
          <span className="header-nick">{localStorage.getItem("username") || ""}</span>
          <button className="header-button" onClick={() => {
            const yid = localStorage.getItem('yandexId') || '';
            const uid = localStorage.getItem('userId') || '';
            const isPseudo = !yid || yid.startsWith('guest_') || yid.startsWith('pseudo_') || uid.startsWith('web_');
            if (isPseudo) navigate('/login');
            else navigate('/profile');
          }}>{(() => { const yid = localStorage.getItem('yandexId') || ''; const uid = localStorage.getItem('userId') || ''; return (!yid || yid.startsWith('guest_') || yid.startsWith('pseudo_') || uid.startsWith('web_')) ? 'Войти' : '👤'; })()}</button>
        </div>
        <div className="challenge-menu">
          {isYandexUser ? (
          <div className="challenge-card">
            <div className="card-icon">🎯</div>
            <h2>Создать комнату</h2>
            <div className="players-selector">
              <label>Игроков:</label>
              <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button className="challenge-btn primary" onClick={handleCreate} disabled={loading || !nickname.trim()}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
          ) : (
          <div className="challenge-card">
            <div className="card-icon">🎯</div>
            <h2>Создать комнату</h2>
            <p style={{color:'#aaa',marginBottom:12}}>Для создания дуэли нужна авторизация</p>
            <button className="challenge-btn primary" onClick={() => navigate('/login')}>
              Войти через Яндекс
            </button>
          </div>
          )}
          <div className="challenge-divider">или</div>
          <div className="challenge-card">
            <div className="card-icon">🤝</div>
            <h2>Ввести код</h2>
            <div className="join-form">
              <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Код" className="code-input code-input-small" maxLength={3} disabled={loading} />
              <button className="challenge-btn primary" onClick={() => {
                if (joinCode.trim()) {
                  setRoomNotFound(false);
                  setRoomFull(false);
                  setCreatorNick('');
                  setScreen('join_by_link');
                  fetch(`/api/duel2/info/${joinCode.trim()}`)
                    .then(r => r.json())
                    .then(d => {
                      if (d.status === 'error') { setRoomNotFound(true); return; }
                      if (d.creator_nickname) setCreatorNick(d.creator_nickname);
                      if (d.players_count >= d.max_players) setRoomFull(true);
                    })
                    .catch(() => { setRoomNotFound(true); });
                }
              }}
                disabled={loading || !joinCode.trim()}>Войти</button>
            </div>
          </div>
          {error && <div className="challenge-error">{error}</div>}
        </div>
      {chatOverlay}
      </div>
    );
  }

  if (screen === 'join_by_link') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <div className="header-center"><img src="/logo.jpg" alt="" className="header-logo" /><span className="header-center-text">Дуэль</span></div>
          <button className="header-button" onClick={handleBackToMenu}>←</button>
          <span className="header-nick">{localStorage.getItem("username") || ""}</span>
          <div />
        </div>
        <div className="challenge-content" style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
          <div className="join-duel-screen">
            <img src="/logo.jpg" alt="" className="logo-img" />
            <h2 style={{color:'#fff',fontWeight:800,margin:'8px 0 0',fontSize:'1.8rem'}}>Бой с кринжем</h2>
            {roomNotFound ? (
              <>
                <div className="join-vs">🤷</div>
                <h2 className="join-title">Такой комнаты не существует</h2>
                <button className="challenge-btn duel" onClick={() => navigate('/login')}>
                  Войти и создать ⚡
                </button>
              </>
            ) : roomFull ? (
              <>
                <div className="join-vs">😞</div>
                <h2 className="join-title">Комната уже заполнена!</h2>
                <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.95rem',textAlign:'center',lineHeight:1.5}}>
                  Все места заняты. Создай свою дуэль!
                </p>
                <button className="challenge-btn duel" onClick={() => navigate('/login')}>
                  Войти и создать ⚡
                </button>
              </>
            ) : (
              <>
                <div className="join-vs">⚔️</div>
                <h2 className="join-title">{creatorNick ? `${creatorNick} вызывает тебя` : 'Тебя вызывают'}<br/>на дуэль!</h2>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="Твой ник..."
                  className="join-nick-input"
                  maxLength={20}
                  autoFocus
                />
                <button className="challenge-btn duel" onClick={handleJoin} disabled={loading || !nickname.trim()}>
                  {loading ? 'Подключение...' : 'Принять вызов ⚡'}
                </button>
                <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.8rem',letterSpacing:'2px'}}>Комната {joinCode}</span>
              </>
            )}
            {error && <div className="challenge-error">{error}</div>}
          </div>
          <button className="leave-duel-btn" onClick={handleLeaveDuel}>Выйти из дуэли</button>
        </div>
      {chatOverlay}
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <div className="header-center"><img src="/logo.jpg" alt="" className="header-logo" /><span className="header-center-text">Дуэль: {room?.code}</span></div>
          <button className="header-button" onClick={handleBackToMenu}>←</button>
          <span className="header-nick">🏠 {room?.code}</span>
          {chatBell}
        </div>
        <div className="challenge-content">
          <div className="lobby-card">
            <h2>Комната {room?.code}</h2>
            <div className="invite-section">
              <button className="challenge-btn secondary" onClick={copyLink}>
                {linkCopied ? '✅ Ссылка скопирована!' : '🔗 Пригласить по ссылке'}
              </button>
              <input
                type="text"
                readOnly
                value={getInviteLink()}
                className="invite-link-input"
                onClick={(e) => e.target.select()}
              />
            </div>
            <div className="players-list">
              <h3>Игроки ({room?.players_count || 0}/{room?.max_players || 2}):</h3>
              {room?.players?.map((p, i) => (
                <div key={i} className="player-row">
                  <span className="player-number">{i + 1}</span>
                  <span className="player-name">{p.nickname || `Игрок ${i+1}`}</span>
                  {p.is_creator && <span className="creator-badge">👑</span>}
                </div>
              ))}
            </div>
            {(room?.players_count || 0) >= (room?.max_players || 2) ? (
              isCreator ? (
                <p className="all-ready">Все игроки в сборе — запускай игру! 🎉</p>
              ) : (
                <p className="all-ready">Все игроки в сборе. Ждём, когда создатель начнёт игру</p>
              )
            ) : (
              <>
                <div className="waiting-dots"><span></span><span></span><span></span></div>
                <p>Ожидание игроков...</p>
              </>
            )}
            {isCreator && room?.players_count >= 2 && (
              <button className="challenge-btn primary" onClick={handleStart} disabled={loading}>
                {loading ? 'Старт...' : '🚀 Начать игру'}
              </button>
            )}
            {!isCreator && <p className="hint">Ждём, когда создатель начнёт игру</p>}
          </div>
          <button className="leave-duel-btn" onClick={handleLeaveDuel}>Выйти из дуэли</button>
        </div>
      {chatOverlay}
      </div>
    );
  }

  if (screen === 'playing') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <div className="header-center"><img src="/logo.jpg" alt="" className="header-logo" /><span className="header-center-text">Дуэль: раунд {room?.current_round}</span></div>
          <button className="header-button" onClick={handleBackToMenu}>←</button>
          <span className="header-nick">⚔️ Раунд {room?.current_round}</span>
          {chatBell}
        </div>
        <div className="challenge-content">
          <div className="task-card">
            <div className="task-label">Ситуация:</div>
            <p className="task-text">{room?.task}</p>
            <div className="scoreboard-mini">
              {room?.players?.map((p, i) => (
                <span key={i} className="score-chip">{p.nickname || `Игрок ${i+1}`}: {p.wins || 0} побед</span>
              ))}
            </div>
          </div>
          {hasAnswered ? (
            <div className="answer-sent">
              <div className="your-grade"><h3>Ответ отправлен! Оценка: {lastGrade}/10</h3></div>
              <div className="waiting-dots"><span></span><span></span><span></span></div>
              <p style={{color: 'rgba(255,255,255,0.7)'}}>Ждём остальных...</p>
            </div>
          ) : (
            <div className="answer-form">
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
                placeholder="Как ты выйдешь из ситуации?..." className="answer-input" rows={4} disabled={loading} />
              <button className="challenge-btn primary" onClick={handleAnswer} disabled={loading || answer.trim().length < 3}>
                {loading ? 'Оценка...' : 'Ответить ⚡'}
              </button>
            </div>
          )}
          <div className="players-status">
            <h3>Игроки:</h3>
            {room?.players?.map((p, i) => {
              const done = currentRoundAnswers.some(a => a.nickname === p.nickname) || (hasAnswered && (p.user_id == userId || p.chat_id === userId));
              return (
                <div key={i} className={`player-status ${done ? 'done' : 'waiting'}`}>
                  <span className="status-icon">{done ? '✅' : '⏳'}</span>
                  <span className="status-name">{p.nickname || `Игрок ${i+1}`}</span>
                  <span className="status-label">{done ? 'прислал ответ' : 'ожидание ответа'}</span>
                </div>
              );
            })}
          </div>
          {error && <div className="challenge-error">{error}</div>}
          <button className="leave-duel-btn" onClick={handleLeaveDuel}>Выйти из дуэли</button>
        </div>
      {chatOverlay}
      </div>
    );
  }

  if (screen === 'round_result') {
    const sorted = [...(room?.players || [])].sort((a, b) => (b.wins || 0) - (a.wins || 0));
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <div className="header-center"><img src="/logo.jpg" alt="" className="header-logo" /><span className="header-center-text">Дуэль: раунд {room?.current_round}</span></div>
          <button className="header-button" onClick={handleBackToMenu}>←</button>
          <span className="header-nick">📊 Раунд {room?.current_round}</span>
          {chatBell}
        </div>
        <div className="challenge-content">
          <div className="result-card">
            <h2 style={{marginBottom: '24px', marginTop: '8px'}}>Результаты раунда</h2>
            {[...currentRoundAnswers].sort((a, b) => b.grade - a.grade).map((a, i) => (
              <div key={i} className={`answer-result ${i === 0 ? 'winner' : ''}`}>
                <div className="answer-result-header">
                  <span className="answer-result-place">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <span className="answer-result-name">{a.nickname}</span>
                  <span className="answer-result-grade">{a.grade}/10</span>
                </div>
                <p className="answer-result-text">«{a.answer}»</p>
                {a.comment && <p className="answer-result-comment">💬 {a.comment}</p>}
              </div>
            ))}
            <h3>Общий счёт</h3>
            <div className="total-scoreboard">
              {sorted.map((p, i) => (
                <div key={i} className={`score-row ${i === 0 ? 'first' : ''}`}>
                  <span className="score-place">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                  <span className="score-name">{p.nickname}</span>
                  <span className="score-total">{p.wins || 0}</span>
                </div>
              ))}
            </div>
            <div className="result-actions">
              {isCreator && room?.current_round < 3 && (
                  <button className="challenge-btn primary" onClick={handleNextRound} disabled={loading}>
                    Следующий вопрос ⚡
                  </button>
              )}
              {room?.current_round >= 3 && (
                  <button className="challenge-btn primary" onClick={handleNextRound} disabled={loading}>
                    Итоги ⚡
                  </button>
              )}
              {!isCreator && room?.current_round < 3 && <p className="hint">Создатель решает: продолжить или закончить</p>}
            </div>
          </div>
        </div>
      {chatOverlay}
      </div>
    );
  }

  if (screen === 'final') {
    const sorted = [...(room?.players || [])].sort((a, b) => (b.wins || 0) - (a.wins || 0));
    const winner = sorted[0];
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <div className="header-center"><img src="/logo.jpg" alt="" className="header-logo" /><span className="header-center-text">Дуэль: итоги</span></div>
          <button className="header-button" onClick={handleBackToMenu}>←</button>
          <span className="header-nick" />
          {chatBell}
        </div>
        <div className="challenge-content">
          <div className="result-card final">
            <div className="result-banner win">
              {sorted.length > 1 && sorted[0]?.wins === sorted[1]?.wins
                ? `🤝 Ничья! Оба с ${sorted[0]?.wins || 0} победами`
                : `🏆 ${winner?.nickname || '—'} победил(${winner?.wins > 1 ? 'и' : 'а'}) в ${winner?.wins} из 3 раундов!`
              }
            </div>
            <div className="final-scoreboard">
              {sorted.map((p, i) => (
                <div key={i} className={`score-row ${i === 0 ? 'first' : ''}`}>
                  <span className="score-place">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
                  </span>
                  <span className="score-name">{p.nickname}</span>
                  <span className="score-total">{p.wins || 0} побед</span>
                </div>
              ))}
            </div>
            {room?.rounds?.length > 0 && (
              <div className="rounds-history">
                <h3>История раундов:</h3>
                {room.rounds.map((r) => (
                  <div key={r.round_number} className="history-round">
                    <div className="history-round-header">Раунд {r.round_number}</div>
                    {r.answers?.map((a, i) => (
                      <div key={i} className={`history-answer ${r.winner_ids && a.grade === Math.max(...r.answers.map(x => x.grade)) ? 'winner' : ''}`}>
                        <span>{a.nickname}: «{a.answer}» → {a.grade}/10</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <button className="challenge-btn primary" onClick={handleBackToMenu}>Меню ⚡</button>
            {isCreator && !room?.rematch_code && (
              <button className="challenge-btn duel" onClick={async () => {
                const nick = localStorage.getItem('username') || localStorage.getItem('nickname') || nickname;
                if (!nick) { handleBackToMenu(); return; }
                setLoading(true);
                reachGoal('duel_rematch');
                try {
                  const data = await duel2Rematch(userId, room.room_id, nick, maxPlayers);
                  if (data.status === 'error') { setError(data.message); setLoading(false); return; }
                  clearRoomId();
                  updateRoom(data); saveRoomId(data.room_id, data.code);
                  setScreen('lobby'); startPolling(data.room_id);
                } catch (e) { setError('Ошибка'); }
                setLoading(false);
              }} disabled={loading} style={{marginTop: '10px'}}>
                Пригласить на новую дуэль ⚔️
              </button>
            )}
            {room?.rematch_code && (
              <div style={{marginTop: '16px', textAlign: 'center'}}>
                <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',marginBottom:'8px'}}>Создатель бросил вызов!</p>
                <a href={`${window.location.origin}/duel?code=${room.rematch_code}`}
                   style={{color:'#a78bfa',fontWeight:600,fontSize:'1.1rem'}}>
                  Присоединиться к реваншу ⚔️
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ChallengePage;
