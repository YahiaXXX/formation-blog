import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import WriteForm from '@/components/WriteForm';

export const dynamic = 'force-dynamic';

export default function Write() {
  if (!getUser()) redirect('/login');
  return <WriteForm />;
}
