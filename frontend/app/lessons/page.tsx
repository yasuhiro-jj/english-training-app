'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, LessonOption } from '@/lib/api';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';
import Link from 'next/link';

export default function LessonsHistoryPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const router = useRouter();
    const [lessons, setLessons] = useState<LessonOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (authLoading || !user) return;

        const fetchLessons = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await api.getLessonHistory(100);
                setLessons(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : '記事履歴の取得に失敗しました');
            } finally {
                setLoading(false);
            }
        };

        fetchLessons();
    }, [authLoading, user]);

    const handleSelectLesson = (lesson: LessonOption) => {
        try {
            sessionStorage.setItem('selected_lesson', JSON.stringify(lesson));
            router.push('/session?from=lesson');
        } catch (e) {
            console.error('[Lessons] Failed to store selected_lesson:', e);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 pt-32 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        ダッシュボードに戻る
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
                        過去の記事レッスン
                    </h1>
                    <p className="text-gray-600 text-lg">
                        これまでに生成した記事レッスンを振り返ることができます
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-8 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                )}

                {/* Lessons List */}
                {!loading && !error && (
                    <>
                        {lessons.length === 0 ? (
                            <div className="text-center py-20">
                                <svg className="w-16 h-16 mx-auto text-indigo-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 text-lg mb-4">まだ記事レッスンがありません</p>
                                <Link
                                    href="/session"
                                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-all"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    最初のレッスンを生成する
                                </Link>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-6">
                                {lessons.map((lesson, index) => (
                                    <div
                                        key={index}
                                        className="p-6 rounded-2xl bg-white border border-gray-200 shadow-lg hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer group"
                                        onClick={() => handleSelectLesson(lesson)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                    {lesson.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                                                    <span>{lesson.date}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span>{lesson.category}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span className="px-2 py-0.5 bg-indigo-100 rounded text-indigo-700">
                                                        {lesson.level}
                                                    </span>
                                                </div>
                                                {lesson.japanese_title && (
                                                    <p className="text-xs text-gray-400 mb-3">
                                                        元記事: {lesson.japanese_title}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                                            {lesson.content}
                                        </p>

                                        {lesson.vocabulary && lesson.vocabulary.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-xs text-gray-500 mb-2">
                                                    語彙: {lesson.vocabulary.length}語
                                                </p>
                                            </div>
                                        )}

                                        <button className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
                                            このレッスンでトレーニング
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
