'use client';

import Link from 'next/link';
import { useAuth } from '../app/lib/auth-context';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // ランディングページ、ログイン画面、サインアップ画面ではヘッダーを非表示にする
    // ランディングページには独自のヘッダーがあるため
    if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 py-2 sm:py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/90 border border-gray-200 backdrop-blur-xl rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-2.5 shadow-xl">
                <div className="flex items-center space-x-3 sm:space-x-8">
                    <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2 group">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                            <span className="text-white font-black text-[10px] sm:text-xs">DS</span>
                        </div>
                        <span className="text-gray-900 font-bold tracking-tight text-xs sm:text-sm hidden sm:block">
                            DeepSpeak
                        </span>
                    </Link>

                    {user && (
                        <>
                            {/* デスクトップ用ナビゲーション */}
                            <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
                                <Link
                                    href="/lessons"
                                    className={`text-xs lg:text-sm font-bold transition-colors ${pathname === '/lessons' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    過去の記事
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className={`text-xs lg:text-sm font-bold transition-colors ${pathname === '/dashboard' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/plans"
                                    className={`text-xs lg:text-sm font-bold transition-colors ${pathname === '/plans' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    プラン
                                </Link>
                                <Link
                                    href="/chat"
                                    className={`flex items-center space-x-1 text-xs lg:text-sm font-bold transition-colors ${pathname === '/chat' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <span>AI Coaching (Chat)</span>
                                </Link>
                            </nav>

                            {/* モバイル用ハンバーガーメニューボタン */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
                                aria-label="メニューを開く"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                <div className="flex items-center space-x-2 sm:space-x-6">
                    {user ? (
                        <>
                            <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[9px] lg:text-[10px] text-indigo-600 font-bold uppercase tracking-widest leading-none mb-0.5 lg:mb-1">
                                    Logged in as
                                </span>
                                <span className="text-xs lg:text-sm text-gray-900 font-medium leading-none">
                                    {user.email}
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl transition-all duration-300 active:scale-95"
                            >
                                ログアウト
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <Link
                                href="/login"
                                className="text-gray-700 font-bold text-xs sm:text-sm hover:text-indigo-600 transition-colors"
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

            {/* モバイル用ドロップダウンメニュー */}
            {user && isMenuOpen && (
                <div className="md:hidden mt-2 mx-3 bg-white/95 border border-gray-200 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden">
                    <nav className="flex flex-col">
                        <Link
                            href="/lessons"
                            onClick={() => setIsMenuOpen(false)}
                            className={`px-4 py-3 text-sm font-bold transition-colors border-b border-gray-100 ${pathname === '/lessons' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`}
                        >
                            過去の記事
                        </Link>
                        <Link
                            href="/dashboard"
                            onClick={() => setIsMenuOpen(false)}
                            className={`px-4 py-3 text-sm font-bold transition-colors border-b border-gray-100 ${pathname === '/dashboard' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/plans"
                            onClick={() => setIsMenuOpen(false)}
                            className={`px-4 py-3 text-sm font-bold transition-colors border-b border-gray-100 ${pathname === '/plans' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`}
                        >
                            プラン
                        </Link>
                        <Link
                            href="/chat"
                            onClick={() => setIsMenuOpen(false)}
                            className={`px-4 py-3 text-sm font-bold transition-colors flex items-center space-x-2 ${pathname === '/chat' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'}`}
                        >
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span>AI Coaching (Chat)</span>
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}
