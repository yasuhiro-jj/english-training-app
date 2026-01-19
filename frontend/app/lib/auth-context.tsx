'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const hasRedirected = useRef(false);

    useEffect(() => {
        setMounted(true);
        console.log('[Auth] AuthProvider mounting, restoring session...');

        try {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('auth_token');

            if (storedUser && storedToken) {
                setUser(JSON.parse(storedUser));
                console.log('[Auth] User session restored');
            }
        } catch (e) {
            console.error('[Auth] Session restoration failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Removal of redundant state update log as it's merged into Route Check log above.

    const login = (email: string, token: string) => {
        const userData = { email };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('auth_token', token);
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            router.replace('/login');
        } catch (error) {
            console.error('Logout error:', error);
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
