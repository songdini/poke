const DEFAULT_CHAT_SERVER_PORT = '3001';

export const getChatServerUrl = () => {
  const configuredUrl = import.meta.env.VITE_CHAT_SERVER_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return `http://localhost:${DEFAULT_CHAT_SERVER_PORT}`;
  }

  // 1. 프로덕션 배포(80, 443, 빈 포트)이거나 백엔드 서버(3001)에서 서빙되는 경우 동일 오리진 사용
  if (window.location.port === DEFAULT_CHAT_SERVER_PORT || window.location.port === '' || window.location.port === '80' || window.location.port === '443') {
    return window.location.origin;
  }

  // 2. 개발 환경(5173, 5174, 4173, 3000 등)에서는 3001 포트의 백엔드로 직접 연결
  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_CHAT_SERVER_PORT}`;
};

export const resolveImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const serverUrl = getChatServerUrl();
  return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getSessionToken = (gameType?: string) => {
  if (typeof window === 'undefined') return 'server_session';
  const key = gameType ? `game_session_token_${gameType}` : 'game_session_token';
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem(key, token);
  }
  return token;
};
