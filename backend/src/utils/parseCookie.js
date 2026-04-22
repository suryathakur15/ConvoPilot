/**
 * Minimal cookie parser — reads a single named cookie from the raw
 * Cookie request header without requiring the cookie-parser package.
 */
export const parseCookie = (req, name) => {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === name) return decodeURIComponent(part.slice(eqIdx + 1).trim());
  }
  return null;
};
