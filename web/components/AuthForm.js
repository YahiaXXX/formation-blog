'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Something went wrong');
    router.push('/'); router.refresh();
  }

  return (
    <form onSubmit={submit} className="card">
      <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      {error && <p className="err">{error}</p>}
      {mode === 'register' && (
        <input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      )}
      <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      <input type="password" placeholder="Password (min 8 chars)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      <button disabled={busy}>{mode === 'login' ? 'Log in' : 'Sign up'}</button>
    </form>
  );
}
