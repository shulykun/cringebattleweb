import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import './RulesPage.css';

const RulesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="rules-page">
      <AppHeader backTo="/" title="Правила" />

      <div className="rules-content">
        <div className="rules-intro">
          <p className="rules-intro-text">
            Это игра «Бой с кринжем». Правила такие — я предлагаю неловкую ситуацию,
            а ты придумываешь подходящий ответ, чтобы выйти из неё победителем.
            Чем оригинальнее ответ, тем больше очков ты заработаешь.
          </p>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">🎮 Игра с компьютером</h2>
          <div className="rules-card">
            <p>Тебе доступны следующие команды:</p>
            <ul className="rules-list">
              <li>Чтобы начать игру, скажи <strong>«Давай играть»</strong>.</li>
              <li>Во время раунда можно сказать <strong>«Дай подсказку»</strong> или <strong>«Пропустить вопрос»</strong>.</li>
              <li>Команда <strong>«Мой рейтинг»</strong> — узнать свои очки, <strong>«Отмена»</strong> — выйти в главное меню.</li>
              <li>Можно отправить свою неловкую ситуацию — скажи <strong>«Добавить ситуацию»</strong>, а если хочешь сыграть в неё — <strong>«Своя игра»</strong>.</li>
              <li>И ещё ты можешь сыграть с друзьями онлайн на сайте <a href="https://бойскринжем.рф" target="_blank" rel="noopener noreferrer">бойскринжем.рф</a></li>
            </ul>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">⚔️ Онлайн-игра с друзьями</h2>
          <div className="rules-card">
            <p>Сразись с друзьями в реальном времени! Один создаёт комнату, остальные подключаются по коду.</p>
            <ul className="rules-list">
              <li><strong>Создай комнату</strong> или <strong>присоединись</strong> по коду от друга.</li>
              <li>Каждый раунд — новая неловкая ситуация. Оба игрока пишут ответ.</li>
              <li>Ответы оцениваются по оригинальности — от 1 до 10 баллов.</li>
              <li>Побеждает тот, кто наберёт больше баллов за все раунды.</li>
              <li>При ничьей назначается <strong>тайбрейк</strong> — решающий раунд.</li>
              <li>После игры можно <strong>реванш</strong> — начать новый бой с тем же соперником.</li>
            </ul>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">🏆 Рейтинг</h2>
          <div className="rules-card">
            <ul className="rules-list">
              <li>Очки начисляются за каждый ответ в зависимости от оценки.</li>
              <li>Победишь в дуэли — получишь бонусные очки.</li>
              <li>Чем больше играешь — тем выше в <a href="/leaderboard" onClick={(e) => { e.preventDefault(); navigate('/leaderboard'); }}>таблице лидеров</a>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;
