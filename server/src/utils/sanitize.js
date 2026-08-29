/**
 * 🛡️ 서버 측 입력값 검증 및 XSS 방지 Sanitizer
 */

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeString(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim().slice(0, maxLength);
  return escapeHtml(trimmed);
}

export function sanitizeChatMessage(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim().slice(0, maxLength);
  return escapeHtml(trimmed);
}
