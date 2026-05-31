import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Error tracking
window.onerror = (msg, source, lineno, colno, error) => {
  if (window.ym) {
    window.ym(102000769, 'reachGoal', 'javascript_error', { msg: String(msg).substring(0, 200), source, lineno });
  }
};
window.addEventListener('unhandledrejection', (e) => {
  if (window.ym) {
    window.ym(102000769, 'reachGoal', 'javascript_error', { msg: String(e.reason).substring(0, 200) });
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

