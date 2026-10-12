const KEY = 'adminToken';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

export function adminFromToken() {
  const t = getToken();
  if (!t) return null;
  try {
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return p.role === 'admin' && p.exp * 1000 > Date.now() ? { id: p.id, name: p.name } : null;
  } catch { return null; }
}

async function req(path, opts = {}, auth = true) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });
  if (res.status === 401 && auth) { setToken(null); location.reload(); }
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  login: (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false),
  stats: () => req('/admin/stats'),
  posts: (status) => req(`/admin/posts?status=${status}`),
  setStatus: (id, status) => req(`/admin/posts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deletePost: (id) => req(`/posts/${id}`, { method: 'DELETE' }),
  users: () => req('/admin/users'),
  deleteUser: (id) => req(`/admin/users/${id}`, { method: 'DELETE' }),
};
