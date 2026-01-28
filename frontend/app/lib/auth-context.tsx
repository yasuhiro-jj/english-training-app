'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../lib/api';

interface User {
    email: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, token: string) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認証を一時的に無効化する場合は、このフラグを true に設定
const DISABLE_AUTH = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

/**
 * シンプルな認証プロバイダー
 * localStorageにuser_emailとauth_tokenがあれば認証済みとみなす
 * JWTのデコードや複雑な復元ロジックは削除
 * 
 * 認証を無効化する場合: .env.local に NEXT_PUBLIC_DISABLE_AUTH=true を追加
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // 認証が無効化されている場合、常に認証済みとして扱う
    useEffect(() => {
        if (DISABLE_AUTH) {
            console.log('[Auth] Authentication disabled - always authenticated');
            setUser({ email: 'dev@example.com' });
            setLoading(false);
            return;
        }
    }, []);

    // シンプルな復元：localStorageにemailがあればログイン済みとみなす
    useEffect(() => {
        if (DISABLE_AUTH) return;
        
        console.log('[Auth] Simple AuthProvider mounting...');
        try {
            const storedEmail = localStorage.getItem('user_email');
            const storedToken = localStorage.getItem('auth_token');
            
            if (storedEmail && storedToken) {
                setUser({ email: storedEmail });
                console.log('[Auth] User restored:', storedEmail);
            }
        } catch (e) {
            console.error('[Auth] Session restoration failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // 401エラーで認証情報がクリアされた場合のイベントリスナー
    useEffect(() => {
        if (DISABLE_AUTH) return;
        
        const handleAuthCleared = () => {
            console.log('[Auth] 認証情報がクリアされました（401エラー）');
            setUser(null);
            // ログインページにリダイレクト（useRequireAuthが処理する）
        };
        
        window.addEventListener('auth:cleared', handleAuthCleared);
        return () => window.removeEventListener('auth:cleared', handleAuthCleared);
    }, []);

    const login = (email: string, token: string) => {
        console.log('[Auth] Login:', email);
        setUser({ email });
        localStorage.setItem('user_email', email);
        localStorage.setItem('auth_token', token);
    };

    const logout = async () => {
        try {
            // バックエンドにログアウトを通知（オプション、エラーは無視）
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            }).catch(() => {});
        } finally {
            setUser(null);
            localStorage.removeItem('user_email');
            localStorage.removeItem('auth_token');
            router.replace('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
