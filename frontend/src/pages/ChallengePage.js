import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { duel2Create, duel2Accept, duel2Start, duel2Answer, duel2Next, duel2Finish, duel2Status } from '../services/api';
import './ChallengePage.css';

const POLL_INTERVAL = 3000;

const ChallengePage = () => {
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pollRef = useRef(null);

  // Экраны: menu | lobby | join_by_link | playing | round_result | final
  const [screen, setScreen] = useState('menu');
  const [room, setRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState(() => localStorage.getItem('nickname') || '');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [answer, setAnswer] = useState('');
  const [lastGrade, setLastGrade] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    // Авто-подключение по ссылке с кодом
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setJoinCode(codeFromUrl);
      setScreen('join_by_link');
    }
    return () => stopPolling();
  }, [userId, navigate]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback((roomId) => {
    stopPolling();
    pollRef.current = setInterval(() => pollRoom(roomId), POLL_INTERVAL);
  }, []);

  const updateRoom = (data) => {
    if (data.status === 'success' || data.room_id) {
      setRoom(data);
      return true;
    }
    return false;
  };

  const pollRoom = async (roomId) => {
    try {
      const data = await duel2Status(userId, roomId || room?.room_id);
      if (data.status === 'error') return;
      updateRoom(data);

      // Авто-переключение экранов
      if (data.room_status === 'playing' && screen === 'lobby') {
        setScreen('playing');
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
  };

  // ── Создать комнату ──────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    setError('');
    if (nickname) localStorage.setItem('nickname', nickname);
    try {
      const data = await duel2Create(userId, nickname, maxPlayers);
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      updateRoom(data);
      setScreen('lobby');
      startPolling(data.room_id);
    } catch (e) {
      setError('Ошибка при создании комнаты');
    }
    setLoading(false);
  };

  // ── Войти по коду ────────────────────────────
  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');
    if (nickname) localStorage.setItem('nickname', nickname);
    try {
      const data = await duel2Accept(userId, joinCode.trim(), nickname);
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      updateRoom(data);
      if (data.room_status === 'waiting') {
        setScreen('lobby');
        startPolling(data.room_id);
      } else if (data.room_status === 'playing') {
        setScreen('playing');
        startPolling(data.room_id);
      }
    } catch (e) {
      setError('Ошибка при подключении');
    }
    setLoading(false);
  };

  // ── Начать игру ──────────────────────────────
  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await duel2Start(userId);
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      updateRoom(data);
      setScreen('playing');
    } catch (e) {
      setError('Ошибка при старте');
    }
    setLoading(false);
  };

  // ── Ответить ─────────────────────────────────
  const handleAnswer = async () => {
    if (!answer.trim() || answer.trim().length < 3) return;
    setLoading(true);
    setError('');
    try {
      const data = await duel2Answer(userId, room.room_id, answer.trim());
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      setLastGrade(data.grade);
      updateRoom(data);

      // Все ответили? Показываем результат раунда
      if (data.current_round_data?.all_answered) {
        setScreen('round_result');
      }
    } catch (e) {
      setError('Ошибка при отправке ответа');
    }
    setLoading(false);
  };

  // ── Следующий раунд ──────────────────────────
  const handleNextRound = async () => {
    setLoading(true);
    setError('');
    setAnswer('');
    setLastGrade(null);
    try {
      const data = await duel2Next(userId, room.room_id);
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      updateRoom(data);
      setScreen('playing');
    } catch (e) {
      setError('Ошибка');
    }
    setLoading(false);
  };

  // ── Завершить игру ───────────────────────────
  const handleFinish = async () => {
    setLoading(true);
    try {
      const data = await duel2Finish(userId, room.room_id);
      updateRoom(data);
      setScreen('final');
      stopPolling();
    } catch (e) {
      setError('Ошибка');
    }
    setLoading(false);
  };

  // ── В меню ───────────────────────────────────
  const handleBackToMenu = () => {
    stopPolling();
    setRoom(null);
    setAnswer('');
    setLastGrade(null);
    setError('');
    setScreen('menu');
  };

  // ── Ссылка-приглашение ───────────────────────
  const getInviteLink = () => {
    if (!room?.code) return '';
    return `${window.location.origin}/duel?code=${room.code}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getInviteLink());
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
  };

  // Является ли создателем
  const isCreator = room?.players?.find(p => p.is_creator)?.user_id === parseInt(userId) ||
                    room?.players?.[0]?.user_id === parseInt(userId);

  // Все ли ответили в текущем раунде
  const currentRoundAnswers = room?.answers || [];
  const allAnswered = room?.players && currentRoundAnswers.length >= room.players.length;
  const hasAnswered = room?.answered;

  // ── РЕНДЕР ───────────────────────────────────

  // Меню
  if (screen === 'menu') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={() => navigate('/game')}>
            ← Игра
          </button>
          <h1 className="challenge-title">⚔️ Дуэль</h1>
          <button className="header-button" onClick={() => navigate('/')}>
            Главная
          </button>
        </div>

        <div className="challenge-menu">
          <div className="nickname-field">
            <label>Твой ник:</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Введи никнейм"
              className="code-input"
              maxLength={20}
            />
          </div>

          <div className="challenge-card">
            <div className="card-icon">🎯</div>
            <h2>Создать комнату</h2>
            <div className="players-selector">
              <label>Игроков:</label>
              <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button className="challenge-btn primary" onClick={handleCreate} disabled={loading || !nickname.trim()}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>

          <div className="challenge-divider">или</div>

          <div className="challenge-card">
            <div className="card-icon">🤝</div>
            <h2>Ввести код</h2>
            <div className="join-form">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Код из 3 цифр"
                className="code-input"
                maxLength={3}
                disabled={loading}
              />
              <button className="challenge-btn primary" onClick={handleJoin} disabled={loading || !joinCode.trim() || !nickname.trim()}>
                Войти
              </button>
            </div>
          </div>

          {error && <div className="challenge-error">{error}</div>}
        </div>
      </div>
    );
  }

  // Авто-подключение по ссылке
  if (screen === 'join_by_link') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleBackToMenu}>
            ← Меню
          </button>
          <h1 className="challenge-title">⚔️ Дуэль</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="challenge-card">
            <div className="card-icon">🤝</div>
            <h2>Тебя вызывают на дуэль!</h2>
            <p>Код: <strong>{joinCode}</strong></p>
            <div className="nickname-field">
              <label>Твой ник:</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Введи никнейм"
                className="code-input"
                maxLength={20}
              />
            </div>
            <button className="challenge-btn primary" onClick={handleJoin} disabled={loading || !nickname.trim()}>
              {loading ? 'Подключение...' : 'Принять вызов ⚡'}
            </button>
          </div>
          {error && <div className="challenge-error">{error}</div>}
        </div>
      </div>
    );
  }

  // Лобби — ожидание игроков
  if (screen === 'lobby') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleBackToMenu}>
            ← Меню
          </button>
          <h1 className="challenge-title">🏠 Лобби</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="lobby-card">
            <h2>Комната {room?.code}</h2>

            <div className="invite-section">
              <button className="challenge-btn secondary" onClick={copyCode}>
                📋 Копировать код: <strong>{room?.code}</strong>
              </button>
              <button className="challenge-btn secondary" onClick={copyLink}>
                🔗 Скопировать ссылку
              </button>
            </div>

            <div className="players-list">
              <h3>Игроки ({room?.players_count || 0}/{room?.max_players || 2}):</h3>
              {room?.players?.map((p, i) => (
                <div key={i} className="player-row">
                  <span className="player-number">{i + 1}</span>
                  <span className="player-name">{p.nickname || `Игрок ${i + 1}`}</span>
                  {p.is_creator && <span className="creator-badge">👑</span>}
                </div>
              ))}
            </div>

            <div className="waiting-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Ожидание игроков...</p>

            {isCreator && room?.players_count >= 2 && (
              <button className="challenge-btn primary" onClick={handleStart} disabled={loading}>
                {loading ? 'Старт...' : '🚀 Начать игру'}
              </button>
            )}
            {!isCreator && <p className="hint">Ждём, когда создатель начнёт игру</p>}
          </div>
        </div>
      </div>
    );
  }

  // Игра — задача + ввод ответа
  if (screen === 'playing') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleBackToMenu}>
            ← Выйти
          </button>
          <h1 className="challenge-title">⚔️ Раунд {room?.current_round}</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="task-card">
            <div className="task-label">Ситуация:</div>
            <p className="task-text">{room?.task}</p>
            <div className="scoreboard-mini">
              {room?.players?.map((p, i) => (
                <span key={i} className="score-chip">
                  {p.nickname || `Игрок ${i + 1}`}: {p.total_score} очков
                </span>
              ))}
            </div>
          </div>

          {hasAnswered ? (
            <div className="answer-sent">
              <div className="your-grade">
                <h3>Твой ответ отправлен! Оценка: {lastGrade}/10</h3>
              </div>
              <div className="waiting-dots">
                <span></span><span></span><span></span>
              </div>
              <p>Ждём остальных...</p>
            </div>
          ) : (
            <div className="answer-form">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Как ты выйдешь из ситуации?..."
                className="answer-input"
                rows={4}
                disabled={loading}
              />
              <button className="challenge-btn primary" onClick={handleAnswer} disabled={loading || answer.trim().length < 3}>
                {loading ? 'Оценка...' : 'Ответить ⚡'}
              </button>
            </div>
          )}

          {/* Табло ответов раунда */}
          {currentRoundAnswers.length > 0 && (
            <div className="round-scoreboard">
              <h3>Раунд {room?.current_round}:</h3>
              {currentRoundAnswers.map((a, i) => (
                <div key={i} className="answer-row">
                  <span className="answer-name">{a.nickname}</span>
                  <span className="answer-text">«{a.answer}»</span>
                  <span className="answer-grade">{a.grade}/10</span>
                </div>
              ))}
            </div>
          )}

          {error && <div className="challenge-error">{error}</div>}
        </div>
      </div>
    );
  }

  // Результат раунда
  if (screen === 'round_result') {
    const sorted = [...(room?.players || [])].sort((a, b) => b.total_score - a.total_score);
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleBackToMenu}>
            ← Выйти
          </button>
          <h1 className="challenge-title">📊 Раунд {room?.current_round}</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="result-card">
            <h2>Результаты раунда</h2>
            <div className="round-answers">
              {currentRoundAnswers.map((a, i) => (
                <div key={i} className="answer-row detailed">
                  <span className="answer-name">{a.nickname}</span>
                  <span className="answer-text">«{a.answer}»</span>
                  <span className="answer-grade">{a.grade}/10</span>
                  {a.comment && <span className="answer-comment">{a.comment}</span>}
                </div>
              ))}
            </div>

            <h3>Общий счёт:</h3>
            <div className="total-scoreboard">
              {sorted.map((p, i) => (
                <div key={i} className={`score-row ${i === 0 ? 'first' : ''}`}>
                  <span className="score-place">{i + 1}.</span>
                  <span className="score-name">{p.nickname}</span>
                  <span className="score-total">{p.total_score} очков</span>
                </div>
              ))}
            </div>

            <div className="result-actions">
              {isCreator && (
                <>
                  <button className="challenge-btn primary" onClick={handleNextRound} disabled={loading}>
                    Следующий вопрос ⚡
                  </button>
                  <button className="challenge-btn secondary" onClick={handleFinish} disabled={loading}>
                    Завершить игру
                  </button>
                </>
              )}
              {!isCreator && <p className="hint">Создатель решает: продолжить или закончить</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Финальный результат
  if (screen === 'final') {
    const sorted = [...(room?.players || [])].sort((a, b) => b.total_score - a.total_score);
    const winner = sorted[0];
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleBackToMenu}>
            ← Меню
          </button>
          <h1 className="challenge-title">🏆 Итоги</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="result-card final">
            <div className="result-banner win">
              🏆 Победитель: {winner?.nickname || '—'} ({winner?.total_score} очков)
            </div>

            <div className="final-scoreboard">
              {sorted.map((p, i) => (
                <div key={i} className={`score-row ${i === 0 ? 'first' : ''}`}>
                  <span className="score-place">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className="score-name">{p.nickname}</span>
                  <span className="score-total">{p.total_score} очков</span>
                </div>
              ))}
            </div>

            {/* История раундов */}
            {room?.rounds?.length > 0 && (
              <div className="rounds-history">
                <h3>История раундов:</h3>
                {room.rounds.map((r) => (
                  <div key={r.round_number} className="history-round">
                    <div className="history-round-header">Раунд {r.round_number}</div>
                    {r.answers?.map((a, i) => (
                      <div key={i} className="history-answer">
                        <span>{a.nickname}: «{a.answer}» → {a.grade}/10</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <button className="challenge-btn primary" onClick={handleBackToMenu}>
              Новая игра ⚡
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ChallengePage;
