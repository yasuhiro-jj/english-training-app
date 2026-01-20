'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';

export function useRequireAuth() {
    const { user, loading, login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading || user) return;

        // レース対策:
        // ログイン直後の画面遷移では、Contextの user が未反映の瞬間がある。
        // localStorage にセッションがあれば復元してから判定する。
        try {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('auth_token');
            if (storedUser && storedToken) {
                const parsed = JSON.parse(storedUser) as { email?: string };
                if (parsed?.email) {
                    console.log('[AuthGuard] Restoring session from localStorage, skipping redirect');
                    login(parsed.email, storedToken);
                    return;
                }
            }
        } catch (e) {
            console.warn('[AuthGuard] Failed to restore session from localStorage:', e);
        }

        console.log('[AuthGuard] Not authenticated, redirecting to /login');
        router.replace('/login');
    }, [user, loading, router, login]);

    return { user, loading };
}
