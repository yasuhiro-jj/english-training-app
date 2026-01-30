'use client';

import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AIChat from '@/components/AIChat';

export default function ChatPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400">
                        AI Personal Coach
                    </h1>
                    <p className="mt-2 text-slate-400 uppercase tracking-widest text-xs font-bold">
                        Speak freely. I'm here to help you improve.
                    </p>
                </header>

                <div className="shadow-2xl shadow-emerald-500/10 rounded-3xl overflow-hidden">
                    <AIChat />
                </div>

                <div className="mt-8 text-center text-slate-500 text-sm italic">
                    Tip: Turn on "VOICE ON" to hear me speak! 🎧
                </div>
            </div>
        </div>
    );
}
