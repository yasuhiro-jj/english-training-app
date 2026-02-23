'use client';

import Link from 'next/link';
import { useAuth } from '../app/lib/auth-context';
import { usePathname } from 'next/navigation';

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    // ランディングページ、ログイン画面、サインアップ画面ではヘッダーを非表示にする
    // ランディングページには独自のヘッダーがあるため
    if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 py-2 sm:py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-2.5 shadow-xl">
                <div className="flex items-center space-x-3 sm:space-x-8">
                    <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2 group">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                            <span className="text-white font-black text-[10px] sm:text-xs">DN</span>
                        </div>
                        <span className="text-white font-bold tracking-tight text-xs sm:text-sm hidden sm:block">
                            Daily News English
                        </span>
                    </Link>

                    {user && (
                        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
                            <Link
                                href="/lesson"
                                className={`text-xs lg:text-sm font-bold transition-colors ${pathname === '/lesson' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                Daily News (Lesson)
                            </Link>
                            <Link
                                href="/lessons"
                                className={`text-xs lg:text-sm font-bold transition-colors ${pathname === '/lessons' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                過去の記事
                            </Link>
                                <Link
                                    href="/dashboard"
                                    className={`text-xs lg:text-sm font-bold transition-colors ${pathname === '/dashboard' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                href="/plans"
                                className={`text-xs lg:text-sm font-bold transition-colors ${pathname === '/plans' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                                >
                                    プラン
                                </Link>
                            <Link
                                href="/chat"
                                className={`flex items-center space-x-1 text-xs lg:text-sm font-bold transition-colors ${pathname === '/chat' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span>AI Coaching (Chat)</span>
                            </Link>
                        </nav>
                    )}
                </div>

                <div className="flex items-center space-x-2 sm:space-x-6">
                    {user ? (
                        <>
                            <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[9px] lg:text-[10px] text-indigo-300 font-bold uppercase tracking-widest leading-none mb-0.5 lg:mb-1">
                                    Logged in as
                                </span>
                                <span className="text-xs lg:text-sm text-white font-medium leading-none">
                                    {user.email}
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white hover:text-red-300 font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl transition-all duration-300 active:scale-95"
                            >
                                ログアウト
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <Link
                                href="/login"
                                className="text-white font-bold text-xs sm:text-sm hover:text-indigo-300 transition-colors"
                            >
                                ログイン
                            </Link>
                            <Link
                                href="/signup"
                                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] active:scale-95"
                            >
                                新規登録
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
