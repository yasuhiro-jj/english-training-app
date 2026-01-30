'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    email: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, token?: string) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // ローカルストレージから初期ユーザー情報を確認（あれば）
        console.log('[Auth] AuthProvider mounting, restoring session...');
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('auth_token');
        console.log('[Auth] Stored user:', storedUser ? 'exists' : 'none');
        console.log('[Auth] Stored token:', storedToken ? 'exists' : 'none');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            console.log('[Auth] User session restored:', userData.email);
            setUser(userData);
        } else {
            console.log('[Auth] No stored user found');
        }
        setLoading(false);
    }, []);

    const login = (email: string, token?: string) => {
        console.log('[Auth] Login called with email:', email, 'token:', token ? 'provided' : 'none');
        const userData = { email };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        if (token) {
            localStorage.setItem('auth_token', token);
        }
        console.log('[Auth] User state updated, localStorage saved');
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // エラーが発生してもローカルストレージをクリア
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            router.push('/login');
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
