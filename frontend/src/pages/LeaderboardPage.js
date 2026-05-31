import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        <button className="header-button" onClick={() => navigate('/duel')}>←</button>
        <span className="header-title">🏆 Таблица очков</span>
        <img src="/logo.jpg" alt="" className="header-logo" />
      </div>
      <div className="leaderboard-content">
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
    </div>
  );
};

export default LeaderboardPage;
