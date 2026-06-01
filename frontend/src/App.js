import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import ChallengePage from './pages/ChallengePage';
import LeaderboardPage from './pages/LeaderboardPage';
import UserPage from './pages/UserPage';
import RulesPage from './pages/RulesPage';
import FeedbackPage from './pages/FeedbackPage';
import './App.css';
import { trackPageView } from './services/metrica';

function App() {
  return (
    <Router>
      <MetricaTracker />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/duel" element={<ChallengePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/user/:userId" element={<UserPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function MetricaTracker() {
  const location = useLocation();
  React.useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
}

export default App;

