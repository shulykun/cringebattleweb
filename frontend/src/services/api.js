import axios from 'axios';

// Backend API URL
// По умолчанию используем http://127.0.0.1:5000/api
// В development можно использовать proxy из package.json (перенаправляет на http://127.0.0.1:5000)
// Для production установите REACT_APP_API_URL=https://your-production-domain.com/api
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints
export const authWithYandex = async (codeOrToken) => {
  // Backend должен определить, это code или token, и обработать соответственно
  // Для упрощения отправляем как code (backend должен обменять на token)
  const response = await api.post('/auth/yandex', { code: codeOrToken });
  return response.data;
};

export const getUser = async (userId) => {
  const response = await api.get('/auth/user', { params: { user_id: userId } });
  return response.data;
};

// Game API endpoints (через backend)
export const getScore = async (userId) => {
  const response = await api.post('/score', { user_id: userId });
  return response.data;
};

export const sendMessage = async (userId, message, type = 'SimpleUtterance', callback = null) => {
  const requestData = callback 
    ? { callback }
    : { original_utterance: message, type };
  
  const payload = {
    user_id: userId,
    request: requestData,
  };
  
  // Если есть callback (нажатие кнопки), добавляем meta
  if (callback) {
    payload.meta = {};
  }
  
  const response = await api.post('/message', payload);
  return response.data;
};

// Duel v1 API (legacy)
export const duelCreate = async (userId, nickname = '') => {
  const response = await api.post('/duel/create', { user_id: userId, nickname });
  return response.data;
};

export const duelAccept = async (userId, code, nickname = '') => {
  const response = await api.post('/duel/accept', { user_id: userId, code, nickname });
  return response.data;
};

export const duelAnswer = async (userId, duelId, answer) => {
  const response = await api.post('/duel/answer', { user_id: userId, duel_id: duelId, answer });
  return response.data;
};

export const duelStatus = async (userId, duelId) => {
  const response = await api.get(`/duel/status/${duelId}`, { params: { user_id: userId } });
  return response.data;
};

// Duel v2 API (multi-player rooms)
export const duel2Create = async (userId, nickname = '', maxPlayers = 2) => {
  const response = await api.post('/duel2/create', { user_id: userId, nickname, max_players: maxPlayers });
  return response.data;
};

export const duel2Accept = async (userId, code, nickname = '') => {
  const response = await api.post('/duel2/accept', { user_id: userId, code, nickname });
  return response.data;
};

export const duel2Start = async (userId) => {
  const response = await api.post('/duel2/start', { user_id: userId });
  return response.data;
};

export const duel2Answer = async (userId, roomId, answer) => {
  const response = await api.post('/duel2/answer', { user_id: userId, room_id: roomId, answer });
  return response.data;
};

export const duel2Next = async (userId, roomId) => {
  const response = await api.post('/duel2/next', { user_id: userId, room_id: roomId });
  return response.data;
};

export const duel2Finish = async (userId, roomId) => {
  const response = await api.post('/duel2/finish', { user_id: userId, room_id: roomId });
  return response.data;
};

export const duel2Status = async (userId, roomId) => {
  const response = await api.get(`/duel2/status/${roomId}`, { params: { user_id: userId } });
  return response.data;
};

export default api;

