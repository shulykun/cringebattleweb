import axios from 'axios';

// Прямые запросы к игровому API
const SCORE_API_URL = 'https://cringebattle22.roborumba.com/web_score';
const MESSAGE_API_URL = 'https://cringebattle22.roborumba.com/web_chat';

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getScore = async (userId) => {
  const response = await api.post(SCORE_API_URL, { user_id: userId });
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
  
  const response = await api.post(MESSAGE_API_URL, payload);
  return response.data;
};

export default api;

