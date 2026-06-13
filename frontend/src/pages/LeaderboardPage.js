import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reachGoal } from '../services/metrica';
import './LeaderboardPage.css';
import { Helmet } from 'react-helmet-async';
import AppFooter from '../components/AppFooter';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reachGoal('leaderboard_view');
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') setData(d.leaderboard);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
      <Helmet>
        <title>Таблица лидеров — Бой с кринжем</title>
        <meta name="description" content="Рейтинг игроков Бой с кринжем. Лучшие ответы, топ игроки, статистика." />
      </Helmet>
        <button className="header-button" onClick={() => navigate('/')}>←</button>
        <img src="/logo.jpg" alt="" className="header-logo-centered" />
      </div>
      <div className="leaderboard-content">
        <h2 className="leaderboard-title">🏆 Таблица лидеров</h2>
        {loading ? (
          <div className="leaderboard-loading">Загрузка...</div>
        ) : data.length === 0 ? (
          <div className="leaderboard-empty">Пока нет данных</div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Игрок</th>
                <th>Очки</th>
                <th>Ср.</th>
                <th>Игр</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.user_id} className={i < 3 ? `top-${i + 1}` : ''}>
                  <td className="rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="nickname"><a href={`/user/${row.user_id}`} className="nickname-link">{row.nickname || 'Игрок'}</a></td>
                  <td className="score">{row.sum_grade}</td>
                  <td className="avg">{row.avg_grade}</td>
                  <td className="games">{row.game_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="leaderboard-actions">
        <button className="lb-action-btn play" onClick={() => navigate('/voice')}>🎮 Играть одному</button>
        <button className="lb-action-btn duel" onClick={() => navigate('/duel')}>⚔️ Онлайн-дуэль</button>
      </div>
      <AppFooter />
    </div>
  );
};

export default LeaderboardPage;
