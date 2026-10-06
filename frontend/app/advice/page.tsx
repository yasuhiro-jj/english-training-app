"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, FeedbackItem } from '@/lib/api';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';

const categoryStyle = (category: string) => {
  if (category === 'Grammar') return 'bg-blue-100 text-blue-800';
  if (category === 'Vocabulary') return 'bg-purple-100 text-purple-800';
  return 'bg-yellow-100 text-yellow-800';
};

interface AdviceRow {
  key: string;
  category: string;
  reason: string;
  examples: FeedbackItem[];
}

export default function AdvicePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await api.getRecentFeedback(300);
        setItems(data);
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('認証')) return;
        setError('アドバイスの取得に失敗しました。時間をおいて再度お試しください。');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // 同じアドバイスは1行にまとめ、何回指摘されたかが分かるようにする(新しい順)
  const rows = useMemo<AdviceRow[]>(() => {
    const map = new Map<string, AdviceRow>();
    for (const item of items) {
      const reason = (item.reason || '').trim();
      if (!reason) continue;
      const key = `${item.category}::${reason}`;
      const existing = map.get(key);
      if (existing) {
        existing.examples.push(item);
      } else {
        map.set(key, { key, category: item.category, reason, examples: [item] });
      }
    }
    return Array.from(map.values());
  }, [items]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.category || 'Other', (counts.get(r.category || 'Other') || 0) + 1);
    return Array.from(counts.entries());
  }, [rows]);

  const visibleRows = filter === 'ALL' ? rows : rows.filter((r) => (r.category || 'Other') === filter);

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
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            アドバイス一覧
          </h1>
          <p className="mt-3 text-gray-600">
            これまでのアドバイスだけをまとめた一覧です。同じ指摘は1行にまとめ、回数を表示しています。
          </p>
        </header>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-100 border border-red-300 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-700 font-semibold mb-2">まだアドバイスがありません</p>
            <p className="text-sm text-gray-500 mb-6">
              レッスンを終えて解析を行うと、アドバイスがここに蓄積されます。
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              ダッシュボードへ
            </Link>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
              >
                すべて ({rows.length})
              </button>
              {categories.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setFilter(name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === name ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
                >
                  {name} ({count})
                </button>
              ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {visibleRows.map((row) => (
                <details key={row.key} className="group">
                  <summary className="cursor-pointer list-none p-4 flex items-start gap-3 hover:bg-gray-50">
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${categoryStyle(row.category)}`}>
                      {row.category || 'Other'}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 leading-relaxed">{row.reason}</span>
                    {row.examples.length > 1 && (
                      <span className="shrink-0 text-xs font-bold text-red-600 bg-red-50 rounded-full px-2 py-0.5">
                        ×{row.examples.length}
                      </span>
                    )}
                  </summary>
                  <div className="px-4 pb-4 space-y-3">
                    {row.examples.map((ex, i) => (
                      <div key={i} className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-xs text-red-600 font-bold mb-1">あなたの発話</p>
                          <p className="text-gray-800 break-words">{ex.original_sentence}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs text-green-600 font-bold mb-1">より自然な表現</p>
                          <p className="text-gray-800 break-words">{ex.corrected_sentence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">行をタップすると、そのアドバイスのもとになった発話と修正例が開きます。</p>
          </>
        )}

        <div className="mt-10 text-center">
          <Link href="/feedback" className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
            フィードバックの詳細を見る →
          </Link>
        </div>
      </div>
    </div>
  );
}
