'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/app/lib/auth-context';
import { useRouter } from 'next/navigation';
import AIChat from '@/components/AIChat';

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        console.log('[Dashboard] useEffect triggered - authLoading:', authLoading, 'user:', user ? user.email : 'null');
        
        if (!authLoading && !user) {
            console.log('[Dashboard] No user found, redirecting to /login');
            router.push('/login');
            return;
        }

        if (user) {
            console.log('[Dashboard] User authenticated, fetching stats for:', user.email);
            const fetchStats = async () => {
                try {
                    console.log('[Dashboard] Calling getDashboardStats...');
                    const data = await api.getDashboardStats();
                    console.log('[Dashboard] Stats fetched successfully:', data);
                    setStats(data);
                } catch (err: any) {
                    console.error('[Dashboard] Error fetching stats:', err);
                    console.error('[Dashboard] Error message:', err.message);
                    setError('データの取得に失敗しました: ' + (err.message || 'Unknown error'));
                } finally {
                    setLoading(false);
                }
            };
            fetchStats();
        }
    }, [user, authLoading, router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        Welcome back, {user?.email.split('@')[0]}
                    </h1>
                    <p className="mt-2 text-slate-400 uppercase tracking-widest text-xs font-bold">Your Learning Dashboard</p>
                </header>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 backdrop-blur-md">
                        {error}
                    </div>
                )}

                {/* Action Cards */}
                <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Lesson Generation Card */}
                    <div
                        onClick={() => router.push('/lesson')}
                        className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 shadow-2xl shadow-emerald-500/20 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="relative z-10 flex flex-col gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-2 italic">Daily News English</h2>
                                <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest">Generate lesson from news articles</p>
                            </div>
                            <div className="flex items-center">
                                <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 group-hover:bg-white/30 transition-colors">
                                    <span className="text-white font-bold text-lg flex items-center">
                                        レッスン生成
                                        <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                        <div className="absolute left-1/2 top-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
                    </div>

                    {/* Past Lessons Card */}
                    <div
                        onClick={() => router.push('/lessons')}
                        className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-700 rounded-3xl p-8 shadow-2xl shadow-blue-500/20 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="relative z-10 flex flex-col gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-2 italic">過去の記事</h2>
                                <p className="text-blue-100 text-sm font-medium opacity-80 uppercase tracking-widest">Review your past lessons</p>
                            </div>
                            <div className="flex items-center">
                                <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 group-hover:bg-white/30 transition-colors">
                                    <span className="text-white font-bold text-lg flex items-center">
                                        記事履歴
                                        <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                        <div className="absolute left-1/2 top-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
                    </div>

                    {/* Training Session Card */}
                    <div
                        onClick={() => router.push('/session')}
                        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-2xl shadow-indigo-500/20 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="relative z-10 flex flex-col gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-2 italic">トレーニング開始</h2>
                                <p className="text-indigo-100 text-sm font-medium opacity-80 uppercase tracking-widest">Start your conversation training</p>
                            </div>
                            <div className="flex items-center">
                                <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 group-hover:bg-white/30 transition-colors">
                                    <span className="text-white font-bold text-lg flex items-center">
                                        START TRAINING
                                        <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                        <div className="absolute left-1/2 top-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all group">
                        <p className="text-slate-400 text-sm font-medium mb-1 group-hover:text-indigo-300 transition-colors">Total Sessions</p>
                        <h2 className="text-5xl font-black text-white">{stats?.summary?.total_sessions || 0}</h2>
                        <div className="mt-4 h-1 w-12 bg-indigo-500 rounded-full"></div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all group">
                        <p className="text-slate-400 text-sm font-medium mb-1 group-hover:text-purple-300 transition-colors">Training Time</p>
                        <h2 className="text-5xl font-black text-white">{stats?.summary?.total_duration_minutes || 0}<span className="text-xl font-normal text-slate-500 ml-2">min</span></h2>
                        <div className="mt-4 h-1 w-12 bg-purple-500 rounded-full"></div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all group">
                        <p className="text-slate-400 text-sm font-medium mb-1 group-hover:text-emerald-300 transition-colors">Last Active</p>
                        <h2 className="text-2xl font-bold text-white mt-3">
                            {stats?.summary?.last_active ? new Date(stats.summary.last_active).toLocaleDateString() : 'No activity'}
                        </h2>
                        <div className="mt-4 h-1 w-12 bg-emerald-500 rounded-full"></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left & Right: Mistake Trends & Recent Feedback */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Mistake Trends */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                            <h3 className="text-xl font-bold mb-8 flex items-center">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mr-3">🚀</span>
                                Focus Areas
                            </h3>
                            <div className="space-y-6">
                                {stats?.mistake_trends && stats.mistake_trends.length > 0 ? (
                                    stats.mistake_trends.map((m: any, i: number) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold text-slate-300">{m.category}</span>
                                                <span className="text-indigo-400">{m.count} items</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                                    style={{ width: `${Math.min(100, (m.count / (stats.summary.total_sessions || 1)) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500 italic">No feedback data recorded yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Feedback Feed */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                            <h3 className="text-xl font-bold mb-8 flex items-center">
                                <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mr-3">✍️</span>
                                Recent Improvements
                            </h3>
                            <div className="space-y-4">
                                {stats?.recent_feedback && stats.recent_feedback.length > 0 ? (
                                    stats.recent_feedback.map((fb: any, i: number) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                                            <p className="text-xs font-bold text-indigo-400 mb-1 uppercase tracking-tighter">{fb.category}</p>
                                            <p className="text-sm text-slate-300 italic mb-2">"{fb.original_sentence}"</p>
                                            <p className="text-sm text-emerald-400 font-medium">→ {fb.corrected_sentence}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500 italic text-center py-8">Keep training to see your history here!</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: AI Chat */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-28">
                            <h3 className="text-xl font-bold mb-6 flex items-center">
                                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3">💬</span>
                                AI Free Talk
                            </h3>
                            <AIChat />
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={() => router.push('/session')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-12 rounded-full shadow-2xl shadow-indigo-500/20 transform transition hover:scale-105 active:scale-95"
                    >
                        START TRAINING
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="ml-4 text-slate-400 hover:text-white font-medium transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}
