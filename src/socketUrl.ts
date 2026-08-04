const DEFAULT_CHAT_SERVER_PORT = '3001';

export const getChatServerUrl = () => {
  const configuredUrl = import.meta.env.VITE_CHAT_SERVER_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return `http://localhost:${DEFAULT_CHAT_SERVER_PORT}`;
  }

  // Vite 로컬 개발 포트(5173/3000)일 경우 백엔드 3001 포트로 직접 접속
  if (window.location.port === '5173' || window.location.port === '3000') {
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_CHAT_SERVER_PORT}`;
  }

  // 프로덕션 / Docker 배포 환경 (Nginx 역프록시 적용)
  return window.location.origin;
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
