import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reachGoal } from '../services/metrica';
import { Helmet } from 'react-helmet-async';
import './UserPage.css';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

const UserPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reachGoal('user_profile_view');
    fetch(`/api/user/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') setUser(d.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="user-page">
        <div className="user-header">
          <button className="header-button" onClick={() => navigate(-1)}>←</button>
          <span className="header-title">Профиль</span>
          <img src="/logo.jpg" alt="" className="header-logo" />
        </div>
        <div className="user-loading">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-page">
        <div className="user-header">
          <button className="header-button" onClick={() => navigate(-1)}>←</button>
          <span className="header-title">Профиль</span>
          <img src="/logo.jpg" alt="" className="header-logo" />
        </div>
        <div className="user-loading">Игрок не найден</div>
      </div>
    );
  }

  return (
    <div className="user-page">
      <Helmet>
        <title>{user ? `${user.nickname} — Бой с кринжем` : 'Профиль игрока — Бой с кринжем'}</title>
        <meta name="description" content={user ? `${user.nickname} — #${user.rank || '—'} в рейтинге, ${user.sum_grade || 0} очков, ${user.game_count || 0} игр.` : 'Профиль игрока Бой с кринжем'} />
        {user && (
          <meta property="og:title" content={`${user.nickname} — Бой с кринжем`} />
        )}
        {user && (
          <meta property="og:description" content={`${user.nickname} — #${user.rank || '—'} в рейтинге, ${user.sum_grade || 0} очков, ${user.game_count || 0} игр. Смотри профиль в Бой с кринжем.`} />
        )}
      </Helmet>
      <AppHeader backTo="/leaderboard" />
      <div className="user-content">
        <div className="profile-avatar">
          <span className="avatar-emoji">😎</span>
        </div>
        <div className="user-name">{user.nickname || 'Игрок'}</div>
        {user.rank && (
          <div className="user-rank">#{user.rank} в рейтинге</div>
        )}

        <div className="user-stats">
          <div className="stat-card">
            <div className="stat-value">{user.sum_grade || 0}</div>
            <div className="stat-label">очков</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.game_count || 0}</div>
            <div className="stat-label">сыграно игр</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.avg_grade ? Number(user.avg_grade).toFixed(1) : '—'}</div>
            <div className="stat-label">средний ответ</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.avg_grade_cringe ? Number(user.avg_grade_cringe).toFixed(1) : '—'}</div>
            <div className="stat-label">средний кринж</div>
          </div>
        </div>

        <div className="user-action-buttons">
        <button className="user-action-btn play" onClick={() => navigate('/game')}>🎮 Играть одному</button>
          <button className="user-action-btn duel" onClick={() => navigate('/duel')}>⚔️ Онлайн-дуэль</button>
        </div>

        {user.best_answer && (
          <div className="best-answer">
            <div className="best-answer-label">⭐ Лучший ответ ({Math.round(user.best_answer.grade / 10)}/10)</div>
            <div className="best-answer-task">{user.best_answer.task}</div>
            <div className="best-answer-text">«{user.best_answer.answer}»</div>
          </div>
        )}

        <div className="share-section">
          <div className="share-title">Поделиться профилем</div>
          <div className="share-buttons">
            <button className="share-btn telegram" onClick={() => {
              const url = encodeURIComponent(window.location.href);
              const text = encodeURIComponent(`Профиль ${user.nickname} в Бой с кринжем — #${user.rank} в рейтинге!`);
              window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
            }}>TG</button>
            <button className="share-btn vk" onClick={() => {
              const url = encodeURIComponent(window.location.href);
              window.open(`https://vk.com/share.php?url=${url}`, '_blank');
            }}>VK</button>
            <button className="share-btn copy" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}>📋</button>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default UserPage;
