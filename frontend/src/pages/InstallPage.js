import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { Helmet } from 'react-helmet-async';
import './InstallPage.css';

const InstallPage = () => {
  const navigate = useNavigate();

  return (
    <div className="install-page">
      <Helmet>
        <title>Установить приложение — Бой с кринжем</title>
      </Helmet>
      <AppHeader backTo="/" title="Установка" />

      <div className="install-content">
        <div className="install-card">
          <div className="install-icon">📱</div>
          <h2>Установи игру как приложение</h2>
          <p>Играй без браузера — быстрее и удобнее!</p>
        </div>

        <div className="install-section">
          <h3>iPhone / iPad (Safari)</h3>
          <ol className="install-steps">
            <li>Открой сайт в <strong>Safari</strong></li>
            <li>Нажми кнопку <strong>Поделиться</strong> <span className="share-icon">⬆</span> (внизу экрана)</li>
            <li>Прокрути вниз и выбери <strong>«На экран Домой»</strong></li>
            <li>Нажми <strong>«Добавить»</strong></li>
            <li>Готово! Игра на рабочем столе 🎉</li>
          </ol>
        </div>

        <div className="install-section">
          <h3>Android (Chrome)</h3>
          <ol className="install-steps">
            <li>Открой сайт в <strong>Chrome</strong></li>
            <li>Нажми на <strong>⋮</strong> (три точки, правый верхний угол)</li>
            <li>Выбери <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong></li>
            <li>Нажми <strong>«Установить»</strong></li>
            <li>Готово! 🎉</li>
          </ol>
        </div>

        <div className="install-section">
          <h3>Компьютер (Chrome)</h3>
          <ol className="install-steps">
            <li>Открой сайт в <strong>Chrome</strong></li>
            <li>Справа в адресной строке появится иконка <strong>установки</strong> ⊕</li>
            <li>Нажми <strong>«Установить»</strong></li>
            <li>Готово! 🎉</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
