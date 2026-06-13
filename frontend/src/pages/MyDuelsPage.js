import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { Helmet } from 'react-helmet-async';
import { reachGoal } from '../services/metrica';
import './MyDuelsPage.css';

const MyDuelsPage = () => {
  const navigate = useNavigate();
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId] = useState(() => localStorage.getItem('userId') || '');

  useEffect(() => {
    reachGoal('my_duels_view');
    if (!userId) { setLoading(false); return; }
    fetch(`/api/my-duels?user_id=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'ok') setDuels(d.duels);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const statusLabel = (s) => {
    switch (s) {
      case 'waiting': return '⏳ Ожидание';
      case 'playing': return '⚔️ В процессе';
      case 'finished': return '🏁 Завершена';
      default: return s;
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (!userId) {
    return (
      <div className="myduels-page">
        <AppHeader backTo="/profile" title="Мои дуэли" />
        <div className="myduels-empty">
          <p>Войдите, чтобы увидеть свои дуэли</p>
          <button className="myduels-btn" onClick={() => navigate('/login')}>Войти</button>
        </div>
      </div>
    );
  }

  return (
    <div className="myduels-page">
      <Helmet>
        <title>Мои дуэли — Бой с кринжем</title>
      </Helmet>
      <AppHeader backTo="/profile" title="Мои дуэли" />

      <div className="myduels-content">
        {loading ? (
          <div className="myduels-loading">Загрузка...</div>
        ) : duels.length === 0 ? (
          <div className="myduels-empty">
            <div className="empty-icon">⚔️</div>
            <p>У тебя ещё не было дуэлей</p>
            <button className="myduels-btn" onClick={() => navigate('/duel')}>Начать дуэль</button>
          </div>
        ) : (
          <div className="myduels-list">
            {duels.map((d) => (
              <div key={d.room_id} className={`duel-card ${d.status}`}>
                <div className="duel-card-header">
                  <span className="duel-status">{statusLabel(d.status)}</span>
                  <span className="duel-date">{formatDate(d.created_at)}</span>
                </div>
                <div className="duel-card-body">
                  <div className="duel-info">
                    <span className="duel-score">🎯 {d.my_score} очков</span>
                    <span className="duel-rank">#{d.my_rank} из {d.players_count}</span>
                  </div>
                  {d.status === 'finished' && d.my_rank === 1 && (
                    <span className="duel-badge win">🏆 Победа</span>
                  )}
                  {d.winner_nickname && d.my_rank !== 1 && (
                    <span className="duel-winner">👑 {d.winner_nickname} ({d.winner_score})</span>
                  )}
                </div>
                <div className="duel-card-footer">
                  <span className="duel-code">Код: {d.code}</span>
                  <span className="duel-players">👥 {d.players_count}/{d.max_players}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

        <div className="alice-badge" style={{textAlign:"center",padding:"12px 0 0"}}><a href="https://dialogs.yandex.ru/store/skills/78318e89-boj-s-krinzhe?utm_source=site&utm_medium=badge&utm_campaign=v1&utm_term=d1" target="_blank" rel="noopener noreferrer"><img alt="Алиса это умеет" src="https://dialogs.s3.yandex.net/badges/v1-term1.svg" /></a></div>
export default MyDuelsPage;
