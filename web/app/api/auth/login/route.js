import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { setSession } from '@/lib/session';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const { ok, status, data } = await api('/auth/login', {
    method: 'POST', body: { email: b.email, password: b.password },
  });
  if (!ok) return NextResponse.json({ error: data?.error || 'Login failed' }, { status });
  setSession(data.token);
  return NextResponse.json({ user: data.user });
}
