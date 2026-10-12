import './globals.css';
import Link from 'next/link';
import { getUser } from '@/lib/session';
import LogoutButton from '@/components/LogoutButton';

export const metadata = { title: 'Community Blog' };

export default function RootLayout({ children }) {
  const user = getUser();
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/"><strong>Community Blog</strong></Link>
          <nav>
            {user ? (
              <>
                <Link href="/write">Write</Link>
                <Link href="/my-posts">My posts</Link>
                <span className="muted">{user.name}</span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/register">Sign up</Link>
              </>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
