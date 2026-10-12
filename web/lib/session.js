import { cookies } from 'next/headers';

export const getToken = () => cookies().get('token')?.value || null;

// UI only (the backend verifies the token on every request)
export function getUser() {
  const t = getToken();
  if (!t) return null;
  try {
    const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
    if (p.exp * 1000 < Date.now()) return null;
    return { id: p.id, name: p.name, role: p.role };
  } catch { return null; }
}

export function setSession(token) {
  cookies().set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 7 * 24 * 3600,
  });
}

export const clearSession = () => cookies().delete('token');
