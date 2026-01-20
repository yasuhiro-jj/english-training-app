'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';

export function useRequireAuth() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            console.log('[AuthGuard] Not authenticated, redirecting to /login');
            router.replace('/login');
        }
    }, [user, loading, router]);

    return { user, loading };
}
