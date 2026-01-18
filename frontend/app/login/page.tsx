'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { login } = useAuth();
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'ログインに失敗しました');
            }

            login(email);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0c10] text-white overflow-hidden selection:bg-indigo-500/30 flex items-center justify-center font-sans tracking-tight">
            {/* Hero Background Overlay (Shared with Home) */}
            <div className="fixed inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] scale-110 motion-safe:animate-slow-zoom"
                    style={{ backgroundImage: 'url("/hero-bg.png")' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c10]/70 via-[#0a0c10]/50 to-[#0a0c10]" />

                {/* Animated Orbs */}
                <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            {/* Login Card - Glassmorphism */}
            <div className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
                <div className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-2xl">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-indigo-100/60 text-sm font-medium">
                            Daily News English Training にログイン
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest px-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all duration-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest px-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all duration-300"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_35px_rgba(79,70,229,0.5)] active:scale-[0.98] mt-4"
                        >
                            ログイン
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-indigo-100/40">アカウントをお持ちでないですか？</span>
                        <Link
                            href="/signup"
                            className="ml-2 text-indigo-300 hover:text-white font-bold transition-colors underline decoration-indigo-500/30 underline-offset-4"
                        >
                            新規登録
                        </Link>
                    </div>
                </div>

                {/* Home Link */}
                <div className="mt-8 text-center">
                    <Link href="/" className="text-indigo-100/30 hover:text-indigo-100/60 text-xs transition-colors">
                        ← ホームに戻る
                    </Link>
                </div>
            </div>

            <style jsx global>{`
        @keyframes slow-zoom {
          from { transform: scale(1.0); }
          to { transform: scale(1.1); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s infinite alternate ease-in-out;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
        </div>
    );
}
