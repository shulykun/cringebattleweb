import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { duelCreate, duelAccept, duelAnswer, duelStatus } from '../services/api';
import './ChallengePage.css';

const POLL_INTERVAL = 3000;

const ChallengePage = () => {
  const [userId] = useState(() => localStorage.getItem('userId') || '');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pollRef = useRef(null);

  // Экраны: menu | waiting | task | answering | result | evaluating
  const [screen, setScreen] = useState('menu');
  const [duelId, setDuelId] = useState(null);
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [task, setTask] = useState('');
  const [authorNick, setAuthorNick] = useState('');
  const [opponentNick, setOpponentNick] = useState('');
  const [answer, setAnswer] = useState('');
  const [grade, setGrade] = useState(null);
  const [comment, setComment] = useState('');
  const [youWon, setYouWon] = useState(null);
  const [authorGrade, setAuthorGrade] = useState(null);
  const [opponentGrade, setOpponentGrade] = useState(null);
  const [authorAnswer, setAuthorAnswer] = useState('');
  const [opponentAnswer, setOpponentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(null);

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

  const startPolling = useCallback((id) => {
    stopPolling();
    pollRef.current = setInterval(() => pollStatus(id), POLL_INTERVAL);
  }, []);

  const pollStatus = async (id) => {
    try {
      const data = await duelStatus(userId, id);
      if (data.status === 'error') return;

      if (data.status === 'waiting') {
        // Всё ещё ждём
        return;
      }

      if (data.status === 'in_progress') {
        // Соперник подключился, показываем задачу
        if (screen === 'waiting') {
          stopPolling();
          // Нам нужна задача — но accept уже вернул задачу для соперника
          // Для автора — мы знаем задачу из create
          setOpponentNick(data.opponent_nick || '');
          setScreen('task');
          startPolling(id);
        }
        return;
      }

      if (data.status === 'finished') {
        stopPolling();
        setYouWon(data.you_won);
        setAuthorGrade(data.author_grade);
        setOpponentGrade(data.opponent_grade);
        setAuthorAnswer(data.author_answer || '');
        setOpponentAnswer(data.opponent_answer || '');
        setAuthorNick(data.author_nick || '');
        setOpponentNick(data.opponent_nick || '');
        setScreen('result');
        return;
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
  };

  // ── Создать дуэль ─────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await duelCreate(userId);
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      setDuelId(data.duel_id);
      setCode(data.code);
      setTask(data.task);
      setScreen('waiting');
      startPolling(data.duel_id);
    } catch (e) {
      setError('Ошибка при создании дуэли');
    }
    setLoading(false);
  };

  // ── Присоединиться по коду ────────────────────
  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await duelAccept(userId, joinCode.trim());
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      setDuelId(data.duel_id);
      setTask(data.task);
      setAuthorNick(data.author_nick || 'Соперник');
      setScreen('task');
    } catch (e) {
      setError('Ошибка при подключении');
    }
    setLoading(false);
  };

  // ── Ответить ──────────────────────────────────
  const handleAnswer = async () => {
    if (!answer.trim() || answer.trim().length < 3) return;
    setLoading(true);
    setError('');
    try {
      const data = await duelAnswer(userId, duelId, answer.trim());
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
        return;
      }
      if (data.status === 'evaluated') {
        setGrade(data.grade);
        setComment(data.comment || '');
        setScreen('evaluating');
        // Начинаем polling — ждём когда соперник тоже ответит
        startPolling(duelId);
      } else {
        // LLM ещё думает
        setScreen('evaluating');
        setTimeout(() => pollStatus(duelId), 3000);
      }
    } catch (e) {
      setError('Ошибка при отправке ответа');
    }
    setLoading(false);
  };

  // ── Реванш ────────────────────────────────────
  const handleRematch = () => {
    setScreen('menu');
    setDuelId(null);
    setCode('');
    setJoinCode('');
    setTask('');
    setAnswer('');
    setGrade(null);
    setComment('');
    setYouWon(null);
    setError('');
  };

  // ── Ссылка-приглашение ───────────────────────
  const getInviteLink = () => {
    const base = window.location.origin;
    return `${base}/duel?code=${code}`;
  };

  // ── Копировать код ───────────────────────────
  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getInviteLink());
  };

  // ── Рендер экранов ───────────────────────────

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
          <div className="challenge-card">
            <div className="card-icon">🎯</div>
            <h2>Создать дуэль</h2>
            <p>Получи код и отправь другу</p>
            <button className="challenge-btn primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>

          <div className="challenge-divider">или</div>

          <div className="challenge-card">
            <div className="card-icon">🤝</div>
            <h2>Ввести код</h2>
            <p>Друг дал тебе код? Введи его</p>
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
              <button className="challenge-btn primary" onClick={handleJoin} disabled={loading || !joinCode.trim()}>
                Войти
              </button>
            </div>
          </div>

          {error && <div className="challenge-error">{error}</div>}
        </div>
      </div>
    );
  }

  if (screen === 'waiting') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleRematch}>
            ← Меню
          </button>
          <h1 className="challenge-title">⚔️ Ожидание</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="waiting-card">
            <h2>Отправь код другу:</h2>
            <div className="big-code" onClick={copyCode}>
              {code}
            </div>
            <p className="hint">Нажми на код чтобы скопировать</p>
            <button className="challenge-btn secondary" onClick={copyLink}>
              📋 Скопировать ссылку
            </button>
            <p className="hint">Или отправь ссылку: <a href={getInviteLink()} target="_blank" rel="noreferrer">{getInviteLink()}</a></p>
            <div className="waiting-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Ожидание соперника...</p>
          </div>
          <div className="task-preview">
            <h3>Твоя ситуация:</h3>
            <p>{task}</p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'task') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleRematch}>
            ← Меню
          </button>
          <h1 className="challenge-title">⚔️ Дуэль</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="task-card">
            <div className="task-label">Ситуация:</div>
            <p className="task-text">{task}</p>
            <div className="vs-badge">
              <span>{authorNick || 'Игрок 1'}</span>
              <span className="vs">vs</span>
              <span>{opponentNick || 'Игрок 2'}</span>
            </div>
          </div>
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
          {error && <div className="challenge-error">{error}</div>}
        </div>
      </div>
    );
  }

  if (screen === 'evaluating') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleRematch}>
            ← Меню
          </button>
          <h1 className="challenge-title">⚔️ Дуэль</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="eval-card">
            {grade !== null && (
              <div className="your-grade">
                <h3>Твоя оценка: {grade}/10</h3>
                {comment && <p className="grade-comment">«{comment}»</p>}
              </div>
            )}
            <div className="waiting-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Ждём ответ соперника...</p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'join_by_link') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={() => setScreen('menu')}>
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
            <button className="challenge-btn primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Подключение...' : 'Принять вызов ⚡'}
            </button>
          </div>
          {error && <div className="challenge-error">{error}</div>}
        </div>
      </div>
    );
  }

  if (screen === 'result') {
    return (
      <div className="challenge-page">
        <div className="challenge-header">
          <button className="header-button" onClick={handleRematch}>
            ← Меню
          </button>
          <h1 className="challenge-title">⚔️ Результат</h1>
          <div />
        </div>
        <div className="challenge-content">
          <div className="result-card">
            <div className={`result-banner ${youWon ? 'win' : 'lose'}`}>
              {youWon ? '🏆 Победа!' : '😢 Поражение'}
            </div>
            <div className="result-scores">
              <div className={`result-player ${youWon ? 'winner' : ''}`}>
                <div className="player-name">{authorNick}</div>
                <div className="player-grade">{authorGrade}/10</div>
                <div className="player-answer">«{authorAnswer}»</div>
              </div>
              <div className="result-vs">vs</div>
              <div className={`result-player ${!youWon ? 'winner' : ''}`}>
                <div className="player-name">{opponentNick}</div>
                <div className="player-grade">{opponentGrade}/10</div>
                <div className="player-answer">«{opponentAnswer}»</div>
              </div>
            </div>
            <button className="challenge-btn primary" onClick={handleRematch}>
              Реванш ⚡
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ChallengePage;
