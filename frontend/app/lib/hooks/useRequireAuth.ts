'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';

function decodeJwtSub(token: string): string | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payloadB64 = parts[1];
        const payload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
        const json = atob(padded);
        const data = JSON.parse(json) as { sub?: string };
        return data.sub ?? null;
    } catch {
        return null;
    }
}

export function useRequireAuth() {
    const { user, loading, login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading || user) return;

        // レース対策:
        // ログイン直後の画面遷移では、Contextの user が未反映の瞬間がある。
        // localStorage にセッションがあれば復元してから判定する。
        try {
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken) {
                // userが無くてもtokenがあれば sub(email) から復元してリダイレクトを防ぐ
                const emailFromToken = decodeJwtSub(storedToken);
                if (emailFromToken) {
                    console.log('[AuthGuard] Restoring session from token sub, skipping redirect');
                    login(emailFromToken, storedToken);
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
