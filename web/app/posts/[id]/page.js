import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }) {
  const { ok, data: p } = await api(`/posts/${params.id}`, { token: getToken() });
  if (!ok) notFound();
  return (
    <article>
      <h1>{p.title}</h1>
      <p className="muted">
        by {p.author} · {new Date(p.created_at).toLocaleDateString()}{' '}
        {p.status !== 'published' && <span className={`badge ${p.status}`}>{p.status}</span>}
      </p>
      <div style={{ whiteSpace: 'pre-wrap' }}>{p.content}</div>
    </article>
  );
}
