'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, LessonOption } from '../../lib/api';
import AudioRecorder from '../../components/AudioRecorder';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';
import { convertJapaneseNamesInText } from '../../lib/japaneseToRomaji';

function SessionPageInner() {
    const { user, loading: authLoading } = useRequireAuth();
    const searchParams = useSearchParams();
    // added 'learning' step for reading the article before recording
    const [step, setStep] = useState<'input' | 'selection' | 'learning' | 'recording' | 'analyzing' | 'complete'>('input');
    const [articleUrl, setArticleUrl] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [currentLesson, setCurrentLesson] = useState<LessonOption | null>(null);
    const [transcript, setTranscript] = useState('');
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState('');
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);
    const [lessons, setLessons] = useState<LessonOption[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasProcessedLesson, setHasProcessedLesson] = useState(false);

    useEffect(() => {
        console.log('[Session] Page Mounted');
    }, []);

    // /lesson から来た場合: sessionStorage からレッスンを復元してセッション開始
    useEffect(() => {
        if (authLoading || hasProcessedLesson || !user) return;

        const from = searchParams.get('from');
        const processLesson = async () => {
            try {
                let lessonData: LessonOption | null = null;

                // 1) 推奨: sessionStorage 経由
                if (from === 'lesson') {
                    const stored = sessionStorage.getItem('selected_lesson');
                    if (stored) {
                        lessonData = JSON.parse(stored);
                    }
                }

                // 2) 互換: 旧URLクエリ lesson=...（残ってたら読む）
                if (!lessonData) {
                    const lessonParam = searchParams.get('lesson');
                    if (lessonParam) {
                        // URLSearchParamsは基本デコード済みなのでdecodeURIComponentしない
                        lessonData = JSON.parse(lessonParam);
                    }
                }

                if (!lessonData) {
                    // /lesson から来たのにデータがない → 何が起きたかユーザーに明確に見せる
                    if (from === 'lesson') {
                        setError('レッスン情報が見つかりませんでした。/lesson に戻って「トレーニング開始」をもう一度押してください。');
                        setHasProcessedLesson(true);
                    }
                    return;
                }

                console.log('[Session] Lesson data loaded, starting session...', lessonData);
                await handleSelectLesson(lessonData);

                // セッション開始まで成功したら、保存データを消す
                if (from === 'lesson') {
                    sessionStorage.removeItem('selected_lesson');
                }

                setHasProcessedLesson(true);
            } catch (err) {
                console.error('[Session] Failed to load lesson data:', err);
                setError('レッスンデータの読み込みに失敗しました');
                setHasProcessedLesson(true);
            }
        };

        processLesson();
    }, [searchParams, authLoading, user, hasProcessedLesson]);

    // 認証チェック中のローディング表示
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    // Old method for URL input (kept for compatibility or removal)
    const handleStartSessionUrl = async () => {
        if (!articleUrl.trim()) return;
        setError('');
        try {
            const response = await api.startSession(articleUrl);
            setSessionId(response.session_id);
            // Partial mapping for legacy URL
            setCurrentLesson({
                title: "RareJob Scraped Article",
                date: new Date().toLocaleDateString(),
                category: "News",
                vocabulary: [],
                content: response.article_summary, // Summary as content for now
                discussion_a: [response.question],
                discussion_b: [],
                question: response.question,
                level: "Unknown",
                japanese_title: "Japanese Title"
            });
            setStep('learning');
        } catch (err: any) {
            setError(err.message || 'セッションの開始に失敗しました');
            setStep('input');
        }
    };

    const handleGenerate = async () => {
        console.log('[Session] handleGenerate started');
        setIsGenerating(true);
        setError('');
        try {
            const response = await api.generateLessons();
            console.log('[Session] handleGenerate success:', response);
            setLessons(response.lessons);
            setStep('selection');
        } catch (err: any) {
            console.error('[Session] handleGenerate error:', err);
            setError(err.message || 'レッスンの生成に失敗しました');
        } finally {
            setIsGenerating(false);
            console.log('[Session] handleGenerate finished');
        }
    };

    const handleSelectLesson = async (lesson: LessonOption) => {
        try {
            setError('');
            // セッション開始中の状態が分かるように一時的に analyzing を使う
            setStep('analyzing');
            // LessonOptionをapi.startSessionが期待する形式に変換
            const customContent = {
                title: lesson.title,
                content: lesson.content,
                question: lesson.question || (lesson.discussion_a && lesson.discussion_a[0]) || 'What are your thoughts on this article?'
            };
            
            const response = await api.startSession(undefined, customContent);
            setSessionId(response.session_id);
            setCurrentLesson(lesson);
            setStep('learning');
        } catch (err: any) {
            console.error('[Session] handleSelectLesson error:', err);
            setError(err.message || 'セッションの開始に失敗しました');
            setStep('input');
        }
    };

    const handleStartRecording = () => {
        setStep('recording');
    };

    const handleSubmit = async () => {
        if (!transcript.trim()) {
            setError('音声が認識されませんでした');
            return;
        }

        setStep('analyzing');
        setError('');

        try {
            const response = await api.submitTranscript(sessionId, transcript, duration);
            setAnalysisResult(response);
            setStep('complete');
        } catch (err) {
            setError('解析に失敗しました');
            setStep('recording');
        }
    };

    const handleReset = () => {
        setStep('input');
        setArticleUrl('');
        setSessionId('');
        setCurrentLesson(null);
        setTranscript('');
        setDuration(0);
        setError('');
        setAnalysisResult(null);
        setLessons([]);
        setHasProcessedLesson(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-32 pb-12 font-sans">
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
                    {error && (
                        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {step === 'input' && (
                        <div className="space-y-8 text-center py-10">
                            <h1 className="text-4xl font-bold text-gray-900 mb-4">今日のレッスンを作成</h1>
                            <p className="text-gray-600 mb-8">
                                毎日新聞のトップニュースから、あなただけの英会話レッスンを生成します。
                            </p>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full max-w-md mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xl px-8 py-6 rounded-2xl shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                        <span>ニュース取得＆生成中...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                        <span>今日のレッスンを生成する</span>
                                    </>
                                )}
                            </button>

                            {isGenerating && (
                                <p className="text-sm text-gray-500 mt-4 animate-pulse">
                                    これには30秒ほどかかる場合があります...
                                </p>
                            )}
                        </div>
                    )}

                    {step === 'selection' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">レッスンを選んでください</h2>
                            <p className="text-center text-gray-600 mb-4">
                                元記事: {lessons[0]?.japanese_title}
                            </p>

                            <div className="grid md:grid-cols-2 gap-6">
                                {lessons.map((lesson, index) => (
                                    <div key={index} className="border-2 border-gray-100 hover:border-indigo-500 rounded-xl p-6 transition-all hover:shadow-md cursor-pointer group" onClick={() => handleSelectLesson(lesson)}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${lesson.level === 'B1' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {lesson.level === 'B1' ? '初中級 (B1)' : '中上級 (B2)'}
                                            </span>
                                            <span className="text-xs text-gray-500">{lesson.category}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600">{lesson.title}</h3>
                                        <p className="text-gray-600 text-sm line-clamp-4 mb-4">{lesson.content}</p>
                                        <button className="w-full bg-white border-2 border-indigo-600 text-indigo-600 font-bold py-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            このトピックで話す
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleReset} className="w-full text-gray-500 hover:text-gray-700 mt-4">
                                キャンセルして戻る
                            </button>
                        </div>
                    )}

                    {step === 'learning' && currentLesson && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Header */}
                            <div className="border-b pb-4">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentLesson.title}</h1>
                                <div className="flex items-center text-sm text-gray-500 space-x-4">
                                    <span>{currentLesson.date}</span>
                                    <span>|</span>
                                    <span className="font-semibold text-indigo-600">{currentLesson.category}</span>
                                </div>
                            </div>

                            {/* Unlocking Word Meanings */}
                            {currentLesson.vocabulary && currentLesson.vocabulary.length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        Unlocking Word Meanings
                                    </h2>
                                    <div className="space-y-4">
                                        {currentLesson.vocabulary.map((vocab, i) => (
                                            <div key={i} className="text-sm">
                                                <div className="font-bold text-gray-900">
                                                    {vocab.word} <span className="font-normal text-gray-500">{vocab.pronunciation}</span> <span className="italic text-gray-600">{vocab.type}</span>
                                                </div>
                                                <div className="text-gray-700 mt-1">{vocab.definition}</div>
                                                <div className="text-gray-500 italic mt-0.5">Example: {vocab.example}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Article */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-gray-800 border-l-4 border-indigo-500 pl-3">Article</h2>
                                    <button
                                        onClick={() => {
                                            if (window.speechSynthesis.speaking) {
                                                window.speechSynthesis.cancel();
                                            } else {
                                                // 日本語名をローマ字読みに変換
                                                const textWithRomaji = convertJapaneseNamesInText(currentLesson.content);
                                                console.log('[Read Aloud] Speaking text with Japanese names converted to romaji');
                                                const utterance = new SpeechSynthesisUtterance(textWithRomaji);
                                                utterance.lang = 'en-US';
                                                utterance.rate = 0.9; // Slightly slower for clarity
                                                window.speechSynthesis.speak(utterance);
                                            }
                                        }}
                                        className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full text-sm font-semibold transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        </svg>
                                        <span>Read Aloud</span>
                                    </button>
                                </div>
                                <div className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                                    {currentLesson.content}
                                </div>
                            </div>

                            {/* Viewpoint Discussion */}
                            <div className="bg-indigo-50 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Viewpoint Discussion</h2>

                                <div className="mb-6">
                                    <h3 className="font-bold text-indigo-700 mb-2">Discussion A</h3>
                                    <ul className="list-disc list-inside space-y-2 text-gray-800">
                                        {currentLesson.discussion_a && currentLesson.discussion_a.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-indigo-700 mb-2">Discussion B</h3>
                                    <ul className="list-disc list-inside space-y-2 text-gray-800">
                                        {currentLesson.discussion_b && currentLesson.discussion_b.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={handleStartRecording}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl shadow-md transition-transform hover:scale-105 flex items-center justify-center space-x-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                <span>Start Recording / Discussion</span>
                            </button>
                        </div>
                    )}

                    {step === 'recording' && currentLesson && (
                        <div className="space-y-6">
                            <h1 className="text-3xl font-bold text-gray-900">Discussion Phase</h1>
                            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded mb-6">
                                <p className="text-lg text-gray-800 font-bold mb-2">Topic: {currentLesson.title}</p>
                                <p className="text-gray-600">Please answer any of the discussion questions or share your thoughts on the article.</p>
                            </div>
                            <AudioRecorder
                                onTranscriptChange={setTranscript}
                                onDurationChange={setDuration}
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={!transcript}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                解析を開始 (Submit for Feedback)
                            </button>
                            <button onClick={() => setStep('learning')} className="w-full text-gray-500 mt-2">
                                記事に戻る
                            </button>
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-xl text-gray-700">AIコーチがフィードバックを作成中...</p>
                        </div>
                    )}

                    {step === 'complete' && analysisResult && (
                        <div className="space-y-6">
                            <h1 className="text-3xl font-bold text-gray-900">完了！</h1>
                            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded">
                                <p className="text-lg text-gray-800">{analysisResult.message}</p>
                                <p className="text-sm text-gray-600 mt-2">
                                    フィードバック件数: {analysisResult.feedback_count}件
                                </p>
                            </div>

                            {/* Feedback Items List */}
                            {analysisResult.feedback_items && analysisResult.feedback_items.length > 0 && (
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">フィードバック詳細</h2>
                                    {analysisResult.feedback_items.map((item: any, index: number) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                            <div className="flex items-center space-x-2 mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.category === 'Grammar' ? 'bg-blue-100 text-blue-800' :
                                                    item.category === 'Vocabulary' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {item.category}
                                                </span>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-red-50 p-4 rounded-lg">
                                                    <p className="text-xs text-red-600 font-bold mb-1">あなたの発話</p>
                                                    <p className="text-gray-800">{item.original_sentence}</p>
                                                </div>
                                                <div className="bg-green-50 p-4 rounded-lg">
                                                    <p className="text-xs text-green-600 font-bold mb-1">より自然な表現</p>
                                                    <p className="text-gray-800">{item.corrected_sentence}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                                                <p className="font-bold mb-1">アドバイス:</p>
                                                <p>{item.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex space-x-4">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                                >
                                    新しいセッション
                                </button>
                                <a
                                    href="/feedback"
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-center"
                                >
                                    フィードバックを見る
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SessionPage() {
    // Next.js requires useSearchParams usage to be wrapped in Suspense
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            }
        >
            <SessionPageInner />
        </Suspense>
    );
}
