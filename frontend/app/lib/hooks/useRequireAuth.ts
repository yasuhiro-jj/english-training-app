'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';

// 認証を一時的に無効化する場合は、このフラグを true に設定
const DISABLE_AUTH = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

/**
 * シンプルな認証チェックフック
 * userがいなければログインページにリダイレクト
 * 複雑な復元ロジックは削除（AuthProviderで処理）
 * 
 * 認証を無効化する場合: .env.local に NEXT_PUBLIC_DISABLE_AUTH=true を追加
 */
export function useRequireAuth() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // 認証が無効化されている場合は何もしない
        if (DISABLE_AUTH) {
            return;
        }

        // loading中は何もしない
        if (loading) {
            return;
        }

        // userがいない場合、ログインページにリダイレクト
        if (!user) {
            console.log('[AuthGuard] Not authenticated, redirecting to /login');
            router.replace('/login');
        }
    }, [user, loading, router]);

    return { user, loading };
}
