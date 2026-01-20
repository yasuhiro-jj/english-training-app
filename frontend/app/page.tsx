'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('[Home] User authenticated, redirecting to /dashboard');
        router.replace('/dashboard');
      } else {
        console.log('[Home] No user session, redirecting to /login');
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Redirection is handled by useEffect. 
  // We return null to avoid flashing the old landing page content.
  return null;
}
