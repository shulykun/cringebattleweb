import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AppFooter.css';

const AppFooter = () => {
  const navigate = useNavigate();

  return (
    <div className="app-footer">
      <button className="footer-link" onClick={() => navigate('/rules')}>Правила</button>
      <button className="footer-link" onClick={() => navigate('/feedback')}>Обратная связь</button>
    </div>
  );
};

export default AppFooter;
