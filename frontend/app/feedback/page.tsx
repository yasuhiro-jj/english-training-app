'use client';

import { useEffect, useState } from 'react';
import { api, FeedbackItem } from '../../lib/api';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';

export default function FeedbackPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const data = await api.getRecentFeedback(20);
                setFeedback(data);
            } catch (err) {
                setError('フィードバックの取得に失敗しました');
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, []);

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'Grammar':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'Vocabulary':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Expression':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'Pronunciation':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-32 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="mb-6">
                    <a href="/" className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>ホームに戻る</span>
                    </a>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">フィードバック履歴</h1>

                    {loading && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-xl text-gray-700">読み込み中...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {!loading && !error && feedback.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-xl text-gray-600">まだフィードバックがありません</p>
                            <a
                                href="/session"
                                className="inline-block mt-4 text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                                セッションを始める →
                            </a>
                        </div>
                    )}

                    {!loading && !error && feedback.length > 0 && (
                        <div className="space-y-4">
                            {feedback.map((item, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getCategoryColor(item.category)}`}>
                                            {item.category}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500 font-semibold mb-1">元の文:</p>
                                            <p className="text-gray-800 bg-red-50 p-3 rounded border-l-4 border-red-400">
                                                {item.original_sentence}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500 font-semibold mb-1">修正後:</p>
                                            <p className="text-gray-800 bg-green-50 p-3 rounded border-l-4 border-green-400">
                                                {item.corrected_sentence}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-500 font-semibold mb-1">理由:</p>
                                            <p className="text-gray-700 bg-blue-50 p-3 rounded">
                                                {item.reason}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
