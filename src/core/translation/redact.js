'use strict';

const SECRET_HEADER = /^(authorization|cookie|set-cookie|x-api-key|api-key|x-auth-token|proxy-authorization)$/i;

function redactHeaders(headers) {
  const out = {};
  if (!headers || typeof headers !== 'object') return out;
  for (const key in headers) {
    if (!Object.prototype.hasOwnProperty.call(headers, key)) continue;
    out[key] = SECRET_HEADER.test(key) ? '***' : String(headers[key]);
  }
  return out;
}

function redactUrl(raw) {
  try {
    const u = new URL(String(raw));
    u.username = '';
    u.password = '';
    const keys = [];
    u.searchParams.forEach(function (v, k) { if (/key|token|secret|auth/i.test(k)) keys.push(k); });
    keys.forEach(function (k) { u.searchParams.set(k, '***'); });
    return u.toString();
  } catch (e) { return '[invalid-url]'; }
}

function safeErrorText(err) {
  return String(err && err.message ? err.message : err)
    .replace(/https?:\/\/[^\s'"]+/g, function (m) { return redactUrl(m); })
    .replace(/(authorization|cookie|x-api-key|api-key)\s*[:=]\s*[^,\s]+/gi, '$1: ***');
}

module.exports = { redactHeaders, redactUrl, safeErrorText };
