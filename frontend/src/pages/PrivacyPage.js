import React from 'react';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import './PrivacyPage.css';
import { Helmet } from 'react-helmet-async';

const PrivacyPage = () => {
  return (
    <div className="rules-page">
      <AppHeader backTo="/" title="Конфиденциальность" />
      <Helmet>
        <title>Политика конфиденциальности — Бой с кринжем</title>
        <meta name="description" content="Политика конфиденциальности игры Бой с кринжем. Какие данные мы собираем и как используем." />
      </Helmet>

      <div className="rules-content">
        <div className="rules-intro">
          <p className="rules-intro-text">
            Приложение «Бой с кринжем» обрабатывает данные пользователей в соответствии с настоящей Политикой.
            Используя Приложение, вы соглашаетесь с условиями.
          </p>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">📋 Какие данные мы собираем</h2>
          <div className="rules-card">
            <ul className="rules-list">
              <li><strong>Учётные данные:</strong> имя пользователя (никнейм), идентификатор аккаунта</li>
              <li><strong>Игровые данные:</strong> результаты раундов, оценки, рейтинг, история игр</li>
              <li><strong>Аудиоданные:</strong> распознавание речи происходит на устройстве и не записывается и не передаётся на сервер</li>
              <li><strong>Технические данные:</strong> тип устройства, версия браузера, время посещения</li>
            </ul>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">🔧 Как мы используем данные</h2>
          <div className="rules-card">
            <ul className="rules-list">
              <li>Для предоставления игрового контента и оценки ответов</li>
              <li>Для ведения рейтинга и статистики</li>
              <li>Для улучшения качества игры</li>
              <li>Для предотвращения мошенничества и нарушений правил</li>
            </ul>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">🔐 Передача данных</h2>
          <div className="rules-card">
            <p>Мы не продаём и не передаём ваши персональные данные третьим лицам. Обработка ответов осуществляется через AI-сервисы в обезличенном виде.</p>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">💾 Хранение данных</h2>
          <div className="rules-card">
            <p>Игровые данные хранятся на серверах в РФ. Вы можете запросить удаление своих данных через форму обратной связи в Приложении.</p>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">👶 Дети</h2>
          <div className="rules-card">
            <p>Приложение не предназначено для детей младше 13 лет. Мы сознательно не собираем данные детей.</p>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">📱 Разрешения устройства</h2>
          <div className="rules-card">
            <ul className="rules-list">
              <li><strong>Микрофон</strong> — для голосового режима (распознавание речи на устройстве)</li>
              <li><strong>Интернет</strong> — для связи с игровым сервером</li>
              <li><strong>Уведомления</strong> — для оповещений о ходе игры</li>
            </ul>
          </div>
        </div>

        <div className="rules-section">
          <h2 className="rules-section-title">✉️ Контакты</h2>
          <div className="rules-card">
            <p>Вопросы по приватности — через форму обратной связи в Приложении или Telegram <a href="https://t.me/shulykun" target="_blank" rel="noopener noreferrer">@shulykun</a></p>
            <p style={{ marginTop: '12px', fontSize: '0.85rem', opacity: 0.5 }}>Последнее обновление: 13 июня 2026</p>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default PrivacyPage;
