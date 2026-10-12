import { useCallback, useEffect, useState } from 'react';
import { api, setToken, adminFromToken } from './api';

export default function App() {
  const [admin, setAdmin] = useState(adminFromToken());
  if (!admin) return <Login onLogin={setAdmin} />;
  return <Dashboard admin={admin} onLogout={() => { setToken(null); setAdmin(null); }} />;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await api.login(email, password);
      if (user.role !== 'admin') throw new Error('This account is not an administrator');
      setToken(token);
      onLogin(adminFromToken());
    } catch (err) { setError(err.message); }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h2>Admin login</h2>
      {error && <p className="err">{error}</p>}
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button>Log in</button>
    </form>
  );
}

function Dashboard({ admin, onLogout }) {
  const [tab, setTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, list] = await Promise.all([
        api.stats(),
        tab === 'users' ? api.users() : api.posts(tab),
      ]);
      setStats(s); setItems(list.items);
    } catch (e) { setError(e.message); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const run = (fn) => async () => { try { await fn(); load(); } catch (e) { setError(e.message); } };

  return (
    <>
      <header>
        <strong>Blog Admin</strong>
        <span>{admin.name} · <button onClick={onLogout}>Log out</button></span>
      </header>
      <div className="wrap">
        {stats && (
          <div className="cards">
            {Object.entries(stats).map(([k, v]) => (
              <div className="stat" key={k}><b>{v}</b><span className="muted">{k}</span></div>
            ))}
          </div>
        )}
        <div className="tabs">
          {['pending', 'published', 'rejected', 'users'].map((t) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        {error && <p className="err">{error}</p>}

        {tab === 'users' ? (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Posts</th><th></th></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.posts}</td>
                  <td>{u.role === 'user' && (
                    <button className="del" onClick={() => confirm(`Delete ${u.email} and all their posts?`) && run(() => api.deleteUser(u.id))()}>Delete</button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table>
            <thead><tr><th>Post</th><th>Author</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <details><summary><b>{p.title}</b></summary><pre>{p.content}</pre></details>
                  </td>
                  <td>{p.author}<br /><span className="muted">{p.email}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {p.status !== 'published' && <button className="ok" onClick={run(() => api.setStatus(p.id, 'published'))}>Publish</button>}{' '}
                    {p.status !== 'rejected' && <button className="no" onClick={run(() => api.setStatus(p.id, 'rejected'))}>Reject</button>}{' '}
                    <button className="del" onClick={() => confirm('Delete this post?') && run(() => api.deletePost(p.id))()}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!items.length && <p className="muted">Nothing here.</p>}
      </div>
    </>
  );
}
