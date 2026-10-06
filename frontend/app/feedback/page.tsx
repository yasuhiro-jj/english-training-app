"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, FeedbackItem } from '@/lib/api';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';

const categoryStyle = (category: string) => {
  if (category === 'Grammar') return 'bg-blue-100 text-blue-800';
  if (category === 'Vocabulary') return 'bg-purple-100 text-purple-800';
  return 'bg-yellow-100 text-yellow-800';
};

export default function FeedbackPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await api.getRecentFeedback(50);
        setItems(data);
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('認証')) return;
        setError('フィードバックの取得に失敗しました。時間をおいて再度お試しください。');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            これまでのフィードバック
          </h1>
          <p className="mt-3 text-gray-600">
            レッスンで間違えた英語と、より自然な表現の一覧です。いつでも見返して復習できます。
          </p>
        </header>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-100 border border-red-300 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-700 font-semibold mb-2">まだフィードバックがありません</p>
            <p className="text-sm text-gray-500 mb-6">
              レッスンを終えて解析を行うと、間違えた箇所がここに蓄積されます。
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              ダッシュボードへ
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
              {item.category && (
                <div className="mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${categoryStyle(item.category)}`}>
                    {item.category}
                  </span>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-xs text-red-600 font-bold mb-1">あなたの発話</p>
                  <p className="text-gray-800 break-words">{item.original_sentence}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-green-600 font-bold mb-1">より自然な表現</p>
                  <p className="text-gray-800 break-words">{item.corrected_sentence}</p>
                </div>
              </div>
              {item.reason && (
                <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  <p className="font-bold mb-1">アドバイス:</p>
                  <p>{item.reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/suggestions"
            className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            開発者へのご意見・ご提案はこちら
          </Link>
        </div>
      </div>
    </div>
  );
}
