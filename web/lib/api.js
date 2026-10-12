// Server-side only: talks to the Express backend over the internal Docker network
export const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function api(path, { method = 'GET', token, body } = {}) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 502, data: { error: 'Backend unreachable' } };
  }
}
