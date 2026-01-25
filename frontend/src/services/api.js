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

export default api;

