'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';
import { useRouter } from 'next/navigation';
import AIChat from '../../components/AIChat';
import { PlanCards } from '../../components/PlanCards';

export default function DashboardPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showTrialExpiredNotification, setShowTrialExpiredNotification] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState(2); // デフォルトは中級 (B1-B2)

    useEffect(() => {
        if (user) {
            console.log('[Dashboard] Fetching stats for user:', user.email);
            const fetchStats = async () => {
                try {
                    const data = await api.getDashboardStats();
                    setStats(data);
                    
                    // 体験期間終了をチェック
                    if (data.subscription && !data.subscription.is_trial && data.subscription.status === 'expired') {
                        // 常にダッシュボードに表示
                        setShowTrialExpiredNotification(true);
                    }
                } catch (err: any) {
                    console.error('[Dashboard] Error fetching stats:', err);
                    // 401エラーの場合、authenticatedFetchで既にlocalStorageがクリアされ、
                    // AuthContextのイベントリスナーがuserをnullに設定するため、
                    // useRequireAuthが自動的にログインページにリダイレクトします
                    // ここではエラーメッセージのみを設定
                    if (err.message?.includes('401') || err.message?.includes('認証')) {
                        console.log('[Dashboard] Authentication failed - localStorage cleared, redirect will happen automatically');
                        // リダイレクトはuseRequireAuthが処理するので、ここでは何もしない
                        return;
                    }
                    setError('データの取得に失敗しました');
                } finally {
                    setLoading(false);
                }
            };
            fetchStats();
        }
    }, [user, router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 pt-32 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Welcome back, {user?.email.split('@')[0]}
                    </h1>
                    <p className="mt-2 text-gray-600 uppercase tracking-widest text-xs font-bold">Your Learning Dashboard</p>
                </header>

                {/* Action Cards */}
                <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lesson Generation Card - Hidden as per user request */}
                    {/*
                    <div
                        onClick={() => router.push(`/lesson?level=${selectedLevel}`)}
                        className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 shadow-2xl shadow-emerald-500/20 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="relative z-10 flex flex-col gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-2 italic">DeepSpeak</h2>
                                <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest mb-4">Business English for Professionals</p>
                                <div className="flex items-center space-x-2 mb-4">
                                    <label htmlFor="lesson-level" className="text-white font-medium">難易度:</label>
                                    <select
                                        id="lesson-level"
                                        className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-white focus:ring-2 focus:ring-emerald-300 focus:border-transparent transition-all"
                                        value={selectedLevel}
                                        onChange={(e) => setSelectedLevel(Number(e.target.value))}
                                    >
                                        <option value={1} className="bg-emerald-700 text-white">1 (初心者)</option>
                                        <option value={2} className="bg-emerald-700 text-white">2 (中級)</option>
                                        <option value={3} className="bg-emerald-700 text-white">3 (上級)</option>
                                    </select>
                                </div>
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
                        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                        <div className="absolute left-1/2 -top-8 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>
                    </div>
                    */}

                    {/* Training Session Card */}
                    <div
                        onClick={() => router.push(`/session?level=${selectedLevel}`)}
                        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-2xl shadow-indigo-500/20 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                    >
                        <div className="relative z-10 flex flex-col gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-2 italic">トレーニング開始</h2>
                                <p className="text-indigo-100 text-sm font-medium opacity-80 uppercase tracking-widest mb-4">Start your conversation training</p>
                                <div className="flex items-center space-x-2 mb-4" onClick={(e) => e.stopPropagation()}>
                                    <label htmlFor="session-level" className="text-white font-medium text-sm">難易度:</label>
                                    <select
                                        id="session-level"
                                        className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-white focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all cursor-pointer z-10 relative"
                                        value={selectedLevel}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            setSelectedLevel(Number(e.target.value));
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ minWidth: '150px' }}
                                    >
                                        <option value={1} className="bg-indigo-700 text-white">初心者</option>
                                        <option value={2} className="bg-indigo-700 text-white">中級者</option>
                                        <option value={3} className="bg-indigo-700 text-white">上級者</option>
                                    </select>
                                </div>
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
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700 backdrop-blur-md">
                        {error}
                    </div>
                )}

                {/* 体験期間終了通知 */}
                {showTrialExpiredNotification && (
                    <div className="mb-8 p-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-2xl shadow-lg">
                        <div className="flex items-start space-x-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">体験期間が終了しました</h3>
                                <p className="text-gray-700 mb-2">
                                    7日間の無料体験期間が終了しました。引き続きご利用いただく場合は、以下のプランからお選びください。
                                </p>
                                <p className="text-sm text-indigo-600 font-semibold mb-4">
                                    ⚠️ 自動課金は一切発生しません。ご希望のプランを選択してから決済を行ってください。
                                </p>
                            </div>
                        </div>
                        
                        <PlanCards />
                        
                        <div className="flex justify-center">
                            <button
                                onClick={() => setShowTrialExpiredNotification(false)}
                                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors text-sm"
                            >
                                後で決める
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white backdrop-blur-xl border border-gray-200 rounded-3xl p-8 hover:bg-indigo-50 transition-all group shadow-lg">
                        <p className="text-gray-600 text-sm font-medium mb-1 group-hover:text-indigo-600 transition-colors">Total Sessions</p>
                        <h2 className="text-5xl font-black text-gray-900">{stats?.summary?.total_sessions || 0}</h2>
                        <div className="mt-4 h-1 w-12 bg-indigo-500 rounded-full"></div>
                    </div>
                    <div className="bg-white backdrop-blur-xl border border-gray-200 rounded-3xl p-8 hover:bg-purple-50 transition-all group shadow-lg">
                        <p className="text-gray-600 text-sm font-medium mb-1 group-hover:text-purple-600 transition-colors">Training Time</p>
                        <h2 className="text-5xl font-black text-gray-900">{stats?.summary?.total_duration_minutes || 0}<span className="text-xl font-normal text-gray-500 ml-2">min</span></h2>
                        <div className="mt-4 h-1 w-12 bg-purple-500 rounded-full"></div>
                    </div>
                    <div className="bg-white backdrop-blur-xl border border-gray-200 rounded-3xl p-8 hover:bg-emerald-50 transition-all group shadow-lg">
                        <p className="text-gray-600 text-sm font-medium mb-1 group-hover:text-emerald-600 transition-colors">Last Active</p>
                        <h2 className="text-2xl font-bold text-gray-900 mt-3">
                            {stats?.summary?.last_active ? new Date(stats.summary.last_active).toLocaleDateString() : 'No activity'}
                        </h2>
                        <div className="mt-4 h-1 w-12 bg-emerald-500 rounded-full"></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left & Right: Mistake Trends & Recent Feedback */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Mistake Trends */}
                        <div className="bg-white backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-lg">
                            <h3 className="text-xl font-bold mb-8 flex items-center text-gray-900">
                                <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-3">🚀</span>
                                Focus Areas
                            </h3>
                            <div className="space-y-6">
                                {stats?.mistake_trends && stats.mistake_trends.length > 0 ? (
                                    stats.mistake_trends.map((m: any, i: number) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold text-gray-700">{m.category}</span>
                                                <span className="text-indigo-600">{m.count} items</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                                    style={{ width: `${Math.min(100, (m.count / (stats.summary.total_sessions || 1)) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 italic">No feedback data recorded yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Feedback Feed */}
                        <div className="bg-white backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-lg">
                            <h3 className="text-xl font-bold mb-8 flex items-center text-gray-900">
                                <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mr-3">✍️</span>
                                Recent Improvements
                            </h3>
                            <div className="space-y-4">
                                {stats?.recent_feedback && stats.recent_feedback.length > 0 ? (
                                    stats.recent_feedback.map((fb: any, i: number) => (
                                        <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-indigo-300 transition-all">
                                            <p className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-tighter">{fb.category}</p>
                                            <p className="text-sm text-gray-700 italic mb-2">"{fb.original_sentence}"</p>
                                            <p className="text-sm text-emerald-600 font-medium">→ {fb.corrected_sentence}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 italic text-center py-8">Keep training to see your history here!</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: AI Chat */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-28">
                            <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900">
                                <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">💬</span>
                                AI Free Talk
                            </h3>
                            <AIChat />
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={() => router.push(`/session?level=${selectedLevel}`)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-12 rounded-full shadow-2xl shadow-indigo-500/20 transform transition hover:scale-105 active:scale-95"
                    >
                        START TRAINING
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="ml-4 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                        Back to Home
                    </button>
                </div>

                {/* プラン導線（無料/体験中のユーザー向けに常時表示） - 一番下に配置 */}
                {(stats?.subscription?.plan === 'free' || stats?.subscription?.is_trial) && !showTrialExpiredNotification && (
                    <div className="mt-12 p-8 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">プランを確認する</h3>
                                <p className="text-gray-700">
                                    必要になったタイミングで、Basic / Premium（月額・年間）から選べます。
                                </p>
                                <p className="text-sm text-indigo-700 font-semibold mt-2">
                                    ⚠️ 自動課金は一切発生しません。
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/plans')}
                                className="shrink-0 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
                            >
                                プランページへ
                            </button>
                        </div>
                        <PlanCards />
                    </div>
                )}
            </div>
        </div>
    );
}
