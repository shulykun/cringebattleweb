import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AppHeader.css';

const AppHeader = ({ backTo = '/', title, logo = true, rightButtons = [], onBack }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) { onBack(); return; }
    navigate(backTo);
  };

  return (
    <div className="app-header">
      <button className="app-header-back" onClick={handleBack}>←</button>
      <div className="app-header-center">
        {logo && <img src="/logo.jpg" alt="" className="app-header-logo" />}
        {title && <span className="app-header-title">{title}</span>}
      </div>
      <div className="app-header-right">
          {rightButtons.map((btn, i) => (
            <button key={i} className="app-header-btn" onClick={btn.onClick}>
              {btn.label}
            </button>
          ))}
        </div>
    </div>
  );
};

export default AppHeader;
