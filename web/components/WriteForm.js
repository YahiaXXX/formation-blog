'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WriteForm() {
  const router = useRouter();
  const [f, setF] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const res = await fetch('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) return router.push('/login');
    if (!res.ok) return setError(data.error || 'Could not submit');
    router.push('/my-posts'); router.refresh();
  }

  return (
    <form onSubmit={submit} className="card">
      <h1>Write a post</h1>
      <p className="muted">Posts are reviewed by an admin before they appear publicly.</p>
      {error && <p className="err">{error}</p>}
      <input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      <textarea rows="12" placeholder="Write something..." value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} required />
      <button disabled={busy}>Submit for review</button>
    </form>
  );
}
