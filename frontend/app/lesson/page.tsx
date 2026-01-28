'use client';

import { useState } from 'react';
import { api, LessonOption } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';

export default function LessonPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [newsUrl, setNewsUrl] = useState('');
  const [lesson, setLesson] = useState<LessonOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateLessonFromUrl = async () => {
    if (!newsUrl.trim()) {
      setError('URLを入力してください');
      return;
    }

    setLoading(true);
    setError('');
    setLesson(null);

    try {
      const response = await api.generateLessonFromUrl(newsUrl);
      
      if (response.lessons && response.lessons.length > 0) {
        setLesson(response.lessons[0]);
      } else {
        throw new Error('レッスンが生成されませんでした');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const generateLessonAuto = async () => {
    setLoading(true);
    setError('');
    setLesson(null);
    setNewsUrl(''); // URLをクリア

    try {
      const response = await api.generateLessonAuto();
      
      if (response.lessons && response.lessons.length > 0) {
        setLesson(response.lessons[0]);
      } else {
        throw new Error('レッスンが生成されませんでした');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            ダッシュボードに戻る
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-blue-200 mb-2">
            Daily News English
          </h1>
          <p className="text-indigo-100/60 text-lg">
            最新ニュースから自動で英語レッスンを生成します
          </p>
        </div>

        {/* Auto Generate Section */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 backdrop-blur-xl">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 mr-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-xl font-bold text-white">自動生成</h2>
          </div>
          <p className="text-indigo-100/70 mb-4 text-sm">
            複数のニュースソースから自動で記事を選び、英語レッスンを生成します
          </p>
          <button
            onClick={generateLessonAuto}
            disabled={loading}
            className="w-full px-6 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_35px_rgba(79,70,229,0.6)] active:scale-95 flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                ワンクリックでレッスン生成
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#0a0c10] text-indigo-300/60">または</span>
          </div>
        </div>

        {/* Manual URL Input Section */}
        <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <label htmlFor="news-url" className="block text-sm font-medium text-indigo-300 mb-2">
            記事URLを指定（任意）
          </label>
          <p className="text-xs text-indigo-100/50 mb-4">
            特定の記事URLからレッスンを生成したい場合は、こちらに入力してください
          </p>
          <div className="flex gap-3">
            <input
              id="news-url"
              type="url"
              value={newsUrl}
              onChange={(e) => setNewsUrl(e.target.value)}
              placeholder="https://mainichi.jp/articles/... または その他のニュースURL"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={loading}
            />
            <button
              onClick={generateLessonFromUrl}
              disabled={loading || !newsUrl.trim()}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_35px_rgba(79,70,229,0.6)] active:scale-95"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  生成中...
                </span>
              ) : (
                'URLから生成'
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Lesson Display */}
        {lesson && (
          <div className="space-y-6">
            {/* Lesson Header */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{lesson.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-indigo-300/60">
                    <span>{lesson.date}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span>{lesson.category}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="px-2 py-1 bg-indigo-500/20 rounded text-indigo-300">{lesson.level}</span>
                  </div>
                  {lesson.japanese_title && (
                    <p className="mt-2 text-sm text-indigo-200/60">元記事: {lesson.japanese_title}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Vocabulary */}
            {lesson.vocabulary && lesson.vocabulary.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Unlocking Word Meanings
                </h3>
                <div className="space-y-3">
                  {lesson.vocabulary.map((vocab, idx) => (
                    <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-lg font-bold text-white">{vocab.word}</span>
                          <span className="ml-2 text-indigo-300 text-sm">{vocab.pronunciation}</span>
                          <span className="ml-2 text-indigo-400/60 text-sm">{vocab.type}</span>
                        </div>
                      </div>
                      <p className="text-indigo-100/80 mb-2">{vocab.definition}</p>
                      <p className="text-sm text-indigo-200/60 italic">例: {vocab.example}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Article Content */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Article
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-indigo-100/90 leading-relaxed whitespace-pre-line">
                  {lesson.content}
                </p>
              </div>
            </div>

            {/* Discussion Questions */}
            {(lesson.discussion_a || lesson.discussion_b) && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Viewpoint Discussion
                </h3>
                
                {lesson.discussion_a && lesson.discussion_a.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-indigo-300 mb-3">Discussion A</h4>
                    <ul className="space-y-2">
                      {lesson.discussion_a.map((q, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-indigo-400 mr-2">•</span>
                          <span className="text-indigo-100/90">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lesson.discussion_b && lesson.discussion_b.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-indigo-300 mb-3">Discussion B</h4>
                    <ul className="space-y-2">
                      {lesson.discussion_b.map((q, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-indigo-400 mr-2">•</span>
                          <span className="text-indigo-100/90">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="pt-6">
              <button
                onClick={() => {
                  try {
                    // URLにJSONを詰めると不安定になりやすいので、sessionStorageで渡す
                    sessionStorage.setItem('selected_lesson', JSON.stringify(lesson));
                  } catch (e) {
                    console.error('[Lesson] Failed to store selected_lesson:', e);
                  }
                  router.push('/session?from=lesson');
                }}
                className="inline-flex items-center justify-center w-full px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_35px_rgba(79,70,229,0.6)] active:scale-95"
              >
                このレッスンでトレーニングを開始
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
