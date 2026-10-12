import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { getToken } from '@/lib/session';

export async function POST(req) {
  const token = getToken();
  if (!token) return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const title = String(b.title || '').trim();
  const content = String(b.content || '').trim();
  if (title.length < 3 || title.length > 200)
    return NextResponse.json({ error: 'Title must be 3-200 characters' }, { status: 400 });
  if (content.length < 10)
    return NextResponse.json({ error: 'Content is too short' }, { status: 400 });
  const { ok, status, data } = await api('/posts', { method: 'POST', token, body: { title, content } });
  return NextResponse.json(data ?? {}, { status: ok ? 201 : status });
}
