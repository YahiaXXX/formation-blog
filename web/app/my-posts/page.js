import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MyPosts() {
  const token = getToken();
  if (!token) redirect('/login');
  const { ok, status, data } = await api('/posts/mine', { token });
  if (status === 401) redirect('/login');
  const posts = ok ? data.items : [];
  return (
    <>
      <h1>My posts</h1>
      {!posts.length && <p className="muted">You have not written anything yet. <Link href="/write">Write a post</Link></p>}
      {posts.map((p) => (
        <article key={p.id}>
          <h2><Link href={`/posts/${p.id}`}>{p.title}</Link></h2>
          <span className={`badge ${p.status}`}>{p.status}</span>{' '}
          <span className="muted">{new Date(p.created_at).toLocaleDateString()}</span>
        </article>
      ))}
    </>
  );
}
