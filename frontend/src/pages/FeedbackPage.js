import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { Helmet } from 'react-helmet-async';
import { reachGoal } from '../services/metrica';
import './FeedbackPage.css';

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('feedback');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    reachGoal('feedback_send');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Аноним',
          message: message.trim(),
          type
        })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setSent(true);
      } else {
        setError(data.message || 'Ошибка отправки');
      }
    } catch {
      setError('Не удалось отправить. Попробуйте позже.');
    }
    setSending(false);
  };

  return (
    <div className="feedback-page">
      <Helmet>
        <title>Обратная связь — Бой с кринжем</title>
      </Helmet>
      <AppHeader backTo="/" title="Обратная связь" />

      <div className="feedback-content">
        {sent ? (
          <div className="feedback-success">
            <div className="success-icon">✅</div>
            <h2>Спасибо!</h2>
            <p>Мы получили ваше сообщение и обязательно его рассмотрим.</p>
            <button className="feedback-btn" onClick={() => navigate('/')}>На главную</button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="feedback-type">
              <button type="button" className={`type-btn ${type === 'feedback' ? 'active' : ''}`} onClick={() => setType('feedback')}>
                💬 Отзыв
              </button>
              <button type="button" className={`type-btn ${type === 'bug' ? 'active' : ''}`} onClick={() => setType('bug')}>
                🐛 Баг
              </button>
              <button type="button" className={`type-btn ${type === 'idea' ? 'active' : ''}`} onClick={() => setType('idea')}>
                💡 Идея
              </button>
            </div>

            <input
              type="text"
              className="feedback-input"
              placeholder="Ваше имя (необязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />

            <textarea
              className="feedback-textarea"
              placeholder={type === 'bug' ? 'Опишите проблему...' : type === 'idea' ? 'Расскажите идею...' : 'Напишите отзыв...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={5}
              required
            />

            {error && <p className="feedback-error">{error}</p>}

            <button type="submit" className="feedback-btn primary" disabled={sending || !message.trim()}>
              {sending ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
