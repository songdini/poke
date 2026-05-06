const DEFAULT_CHAT_SERVER_PORT = '3001';

export const getChatServerUrl = () => {
  const configuredUrl = import.meta.env.VITE_CHAT_SERVER_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return `http://localhost:${DEFAULT_CHAT_SERVER_PORT}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_CHAT_SERVER_PORT}`;
};
