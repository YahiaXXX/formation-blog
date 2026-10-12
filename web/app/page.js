import Link from 'next/link';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  const { ok, data } = await api(`/posts?page=${page}`);
  const posts = ok ? data.items : [];
  return (
    <>
      <h1>Latest posts</h1>
      {!ok && <p className="err">Could not load posts.</p>}
      {ok && !posts.length && <p className="muted">No posts yet. Be the first to write one!</p>}
      {posts.map((p) => (
        <article key={p.id}>
          <h2><Link href={`/posts/${p.id}`}>{p.title}</Link></h2>
          <p className="muted">by {p.author} · {new Date(p.created_at).toLocaleDateString()}</p>
          <p>{p.excerpt}…</p>
        </article>
      ))}
      <nav className="pager">
        <span>{page > 1 && <Link href={`/?page=${page - 1}`}>← Newer</Link>}</span>
        <span>{posts.length === 10 && <Link href={`/?page=${page + 1}`}>Older →</Link>}</span>
      </nav>
    </>
  );
}
