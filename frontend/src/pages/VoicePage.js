import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { sendMessage, getScore } from '../services/api';
import './VoicePage.css';

const STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  WAITING: 'waiting',
  GRADED: 'graded',
};

const WELCOME_TEXT = '👋 Привет! Это игра «Бой с Кринжем». Я буду предлагать неловкие ситуации, а ты будешь придумывать из них выход. Самые остроумные ответы получают максимум очков. Нажми на орб и мы начнем!';

const VoicePage = () => {
  const navigate = useNavigate();
  const [state, setState] = useState(STATES.IDLE);
  const [message, setMessage] = useState(WELCOME_TEXT);
  const [grade, setGrade] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [round, setRound] = useState(0);
  const [scoreJump, setScoreJump] = useState(false);
  const [rings, setRings] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [lastButtons, setLastButtons] = useState([]);
  const [error, setError] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [topBarExpanded, setTopBarExpanded] = useState(false);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const prevScore = useRef(0);

  // Init user
  useEffect(() => {
    const init = async () => {
      const realUserId = localStorage.getItem('userId');
      const yid = localStorage.getItem('yandexId') || '';
      const isReal = realUserId && yid && !yid.startsWith('guest_') && !yid.startsWith('pseudo_');
      if (isReal) {
        setActiveUserId(realUserId);
      } else {
        let guestId = localStorage.getItem('guestUserId');
        if (!guestId) {
          try {
            const res = await fetch('/api/guest', { method: 'POST' });
            const data = await res.json();
            if (data.status === 'ok') {
              guestId = String(data.user_id);
              localStorage.setItem('guestUserId', guestId);
            }
          } catch (e) { console.error(e); }
        }
        setActiveUserId(guestId);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (activeUserId) loadScore();
  }, [activeUserId]);

  const loadScore = async () => {
    try {
      const data = await getScore(activeUserId);
      if (data) {
        if (data.score !== prevScore.current) {
          setScoreJump(true);
          setTimeout(() => setScoreJump(false), 1000);
          prevScore.current = data.score;
        }
        setScoreData(data);
      }
    } catch (e) { console.error(e); }
  };

  // Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; ctx.scale(2, 2); };
    resize();
    window.addEventListener('resize', resize);

    const orbs = Array.from({ length: 6 }, (_, i) => ({
      angle: (Math.PI * 2 / 6) * i,
      speed: 0.005 + Math.random() * 0.008,
      radius: 70 + Math.random() * 30,
      size: 2 + Math.random() * 3,
      opacity: 0.2 + Math.random() * 0.3,
    }));

    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      orbs.forEach(o => {
        o.angle += o.speed;
        const x = cx + Math.cos(o.angle) * o.radius;
        const y = cy + Math.sin(o.angle) * o.radius;
        ctx.beginPath();
        ctx.arc(x, y, o.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${o.opacity})`;
        ctx.fill();
      });
      if (state === STATES.LISTENING) {
        const i = 0.15 + Math.sin(Date.now() / 300) * 0.1;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
        g.addColorStop(0, `rgba(245, 87, 108, ${i})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else if (state === STATES.PROCESSING) {
        const i = 0.1 + Math.sin(Date.now() / 500) * 0.05;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
        g.addColorStop(0, `rgba(102, 126, 234, ${i})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener('resize', resize); };
  }, [state]);

  const addRing = useCallback(() => {
    const id = Date.now();
    setRings(prev => [...prev, id]);
    setTimeout(() => setRings(prev => prev.filter(r => r !== id)), 1500);
  }, []);

  // Speech recognition — with interim results
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Браузер не поддерживает распознавание речи');
      setState(STATES.WAITING);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
      if (final) {
        setInterimText('');
        recognitionRef.current = null;
        sendToEngine(final);
      }
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setInterimText('');
      if (event.error === 'no-speech') setState(STATES.WAITING);
      else { setError(`Ошибка: ${event.error}`); setState(STATES.WAITING); }
    };
    recognition.onend = () => { recognitionRef.current = null; setInterimText(''); };
    recognitionRef.current = recognition;
    recognition.start();
  }, [activeUserId]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setInterimText('');
  }, []);

  const speak = useCallback((text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const clean = text.replace(/[*#_\[\]()]/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ru-RU'; u.rate = 1.2;
    const voices = synthRef.current.getVoices();
    const ruVoice = voices.find(v => v.lang.startsWith('ru'));
    if (ruVoice) u.voice = ruVoice;
    synthRef.current.speak(u);
  }, []);

  const sendToEngine = useCallback(async (text, buttonObj = null) => {
    if (!activeUserId) return;
    setState(STATES.PROCESSING);
    addRing();
    setError(null);
    setInterimText('');

    try {
      const response = await sendMessage(
        activeUserId,
        buttonObj ? null : text,
        buttonObj ? null : 'SimpleUtterance',
        buttonObj
      );
      if (!response?.response) throw new Error('Нет ответа');

      const { text: respText, task_text, buttons, grade_data } = response.response;
      setGrade(grade_data || null);
      setMessage(task_text || respText);
      setLastButtons(buttons || []);
      setRound(prev => prev + 1);
      setState(grade_data ? STATES.GRADED : STATES.SPEAKING);
      speak(respText);
      await loadScore();

      if (!grade_data) {
        setTimeout(() => { setState(prev => prev === STATES.SPEAKING ? STATES.WAITING : prev); }, 3000);
      }
    } catch (e) {
      console.error(e);
      setError('Ошибка. Попробуй ещё раз.');
      setState(STATES.WAITING);
    }
  }, [activeUserId, speak]);

  const handleTap = useCallback(() => {
    if (state === STATES.IDLE) {
      sendToEngine('давай играть');
    } else if (state === STATES.WAITING) {
      setState(STATES.LISTENING);
      addRing();
      startListening();
    } else if (state === STATES.LISTENING) {
      stopListening();
      setState(STATES.WAITING);
    } else if (state === STATES.SPEAKING) {
      synthRef.current?.cancel();
      setState(STATES.WAITING);
    }
  }, [state, sendToEngine, startListening, stopListening, addRing]);

  const handleSuggestClick = useCallback((e, btn) => {
    e.stopPropagation();
    synthRef.current?.cancel();
    sendToEngine(null, btn);
  }, [sendToEngine]);

  const handleContinue = useCallback((e) => {
    e.stopPropagation();
    synthRef.current?.cancel();
    setMessage(''); setGrade(null);
    if (lastButtons.length > 0) sendToEngine(null, lastButtons[0]);
    else sendToEngine('давай играть');
  }, [lastButtons, sendToEngine]);

  const getGradeEmoji = (s) => s >= 8 ? '🔥' : s >= 6 ? '😎' : s >= 4 ? '😅' : '💀';
  const getGradeLabel = (s) => s >= 8 ? 'Мастер!' : s >= 6 ? 'Неплохо' : s >= 4 ? 'Так себе' : 'Провал';
  const getGradeColor = (s) => s >= 7 ? '#FFD700' : s >= 4 ? '#a78bfa' : '#f5576c';

  const showSuggests = [STATES.WAITING, STATES.SPEAKING, STATES.LISTENING, STATES.GRADED].includes(state) && lastButtons.length > 0;

  // Dynamic font size: short text → bigger
  const textLength = message?.length || 0;
  const textFontSize = textLength < 120 ? '1.25rem' : textLength < 300 ? '1.1rem' : '1rem';

  return (
    <div className="voice-page" onClick={state !== STATES.GRADED ? handleTap : undefined}>
      <Helmet><title>Голосовой режим — Бой с кринжем</title></Helmet>

      <div className="voice-top">
        <button className="voice-back" onClick={(e) => { e.stopPropagation(); synthRef.current?.cancel(); navigate('/game'); }}>←</button>
        <div className="voice-top-logo">
          <img src="/logo.jpg" alt="" className="voice-header-logo" />
          <span className="voice-top-title">Голосовой режим</span>
        </div>
        <button className="voice-menu-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>☰</button>
      </div>

      {scoreData && (
        <div className="voice-stats-bar" onClick={(e) => { e.stopPropagation(); setTopBarExpanded(!topBarExpanded); }}>
          <span>Очки: <b className={scoreJump ? 'voice-stats-pulse' : ''}>{scoreData.score || 0}</b></span>
          <span>Рейтинг: <b className={scoreJump ? 'voice-stats-pulse' : ''}>{scoreData.rating ?? '—'}</b></span>
          <span>Стресс: <b>{scoreData.stress_level ?? '—'}</b></span>
          <span className="voice-stats-round">Р{round}</span>
        </div>
      )}

      {topBarExpanded && scoreData && (
        <div className="voice-stats-extra" onClick={(e) => e.stopPropagation()}>
          <div className="vse-item"><span>Раундов</span><b>{scoreData.rounds ?? '—'}</b></div>
          <div className="vse-item"><span>Раунд</span><b>{round}</b></div>
        </div>
      )}

      {menuOpen && (
        <>
          <div className="voice-menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="voice-burger-menu" onClick={(e) => e.stopPropagation()}>
            <div className="vbm-header">
              <span>Меню</span>
              <button onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <nav className="vbm-nav">
              <button onClick={() => { synthRef.current?.cancel(); setMenuOpen(false); navigate('/game'); }}>🎮 Одиночная игра</button>
              <button onClick={() => { synthRef.current?.cancel(); setMenuOpen(false); navigate('/duel'); }}>⚔️ Дуэль</button>
              <button onClick={() => { synthRef.current?.cancel(); setMenuOpen(false); navigate('/leaderboard'); }}>📊 Рейтинг</button>
              <button onClick={() => { synthRef.current?.cancel(); setMenuOpen(false); navigate('/profile'); }}>👤 Профиль</button>
              <button onClick={() => { synthRef.current?.cancel(); setMenuOpen(false); navigate('/rules'); }}>📋 Правила</button>
            </nav>
          </div>
        </>
      )}

      <div className="voice-main">
        <div className="voice-content-area">
          {message && (
            <div className={`voice-fulltext ${state === STATES.GRADED ? 'fulltext-graded' : ''}`}>
              {grade && (
                <div className="voice-grade-display" style={{ '--grade-color': getGradeColor(grade.score) }}>
                  <div className="vgd-metric">
                    <div className="vgd-metric-label">Оценка</div>
                    <div className="vgd-score-row">
                      <span className="vgs-num">{grade.score}</span>
                      <span className="vgs-max">/10</span>
                    </div>
                    <div className="vgd-label">{getGradeLabel(grade.score)}</div>
                  </div>
                  <div className="vgd-divider" />
                  <div className="vgd-metric">
                    <div className="vgd-metric-label">Кринж</div>
                    <div className="vgd-score-row">
                      <span className="vgd-cringe-num">{grade.cringe}</span>
                      <span className="vgs-max">/10</span>
                    </div>
                    <div className="vgd-cringe-label">Уровень кринжа</div>
                  </div>
                </div>
              )}
              <p className="voice-fulltext-p" style={{ fontSize: textFontSize }}>{message}</p>
            </div>
          )}

          {interimText && (
            <div className="voice-interim">
              <span className="voice-interim-text">{interimText}</span>
              <span className="voice-interim-cursor">▌</span>
            </div>
          )}

          {error && <p className="voice-error">{error}</p>}
        </div>

        <div className="voice-bottom-area">
          {state === STATES.GRADED && !showSuggests && (
            <button className="voice-continue" onClick={handleContinue}>
              Дальше →
            </button>
          )}

          {showSuggests && (
            <div className="voice-suggests" onClick={(e) => e.stopPropagation()}>
              {lastButtons.map((btn, i) => (
                <button
                  key={i}
                  className="voice-suggest-btn"
                  onClick={(e) => handleSuggestClick(e, btn)}
                >
                  {btn.title}
                </button>
              ))}
            </div>
          )}

          <div className="voice-orb-container">
            <canvas ref={canvasRef} className="voice-orb-canvas" />
            {rings.map(id => <div key={id} className="voice-ring" />)}

            <div className={`voice-orb ${state}`}>
              {state === STATES.IDLE && <span className="orb-icon">🎮</span>}
              {state === STATES.LISTENING && <span className="orb-icon pulse-red">🎙</span>}
              {state === STATES.PROCESSING && <div className="orb-spinner" />}
              {state === STATES.SPEAKING && <span className="orb-icon">💬</span>}
              {state === STATES.WAITING && <span className="orb-icon breathe">🎙</span>}
              {state === STATES.GRADED && grade && (
                <span className="orb-icon grade-appear" style={{ color: getGradeColor(grade.score) }}>
                  {getGradeEmoji(grade.score)}
                </span>
              )}
            </div>

            <div className="voice-state-label">
              {state === STATES.IDLE && 'Нажми чтобы начать'}
              {state === STATES.LISTENING && 'Слушаю...'}
              {state === STATES.PROCESSING && 'Думаю...'}
              {state === STATES.SPEAKING && 'Ситуация'}
              {state === STATES.WAITING && 'Нажми чтобы ответить'}
              {state === STATES.GRADED && 'Оценка'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoicePage;
