'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, LessonOption } from '../../lib/api';
import AudioRecorder from '../../components/AudioRecorder';
import { useRequireAuth } from '../lib/hooks/useRequireAuth';
import { convertJapaneseNamesInText } from '../../lib/japaneseToRomaji';

function normalizeString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function normalizeStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function normalizeVocabulary(value: unknown): LessonOption['vocabulary'] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((v) => v && typeof v === 'object')
        .map((v: any) => ({
            word: normalizeString(v.word),
            pronunciation: normalizeString(v.pronunciation),
            type: normalizeString(v.type),
            definition: normalizeString(v.definition),
            example: normalizeString(v.example),
        }))
        .filter((v) => v.word || v.definition);
}

function normalizeLesson(raw: unknown): LessonOption {
    const r: any = raw && typeof raw === 'object' ? raw : {};
    return {
        title: normalizeString(r.title),
        date: normalizeString(r.date),
        category: normalizeString(r.category),
        vocabulary: normalizeVocabulary(r.vocabulary),
        content: normalizeString(r.content),
        discussion_a: normalizeStringArray(r.discussion_a),
        discussion_b: normalizeStringArray(r.discussion_b),
        question: normalizeString(r.question),
        level: normalizeString(r.level),
        japanese_title: normalizeString(r.japanese_title),
    };
}

function safeGetStorageItem(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch {
        // iOS/Safari private mode 等で sessionStorage が例外になることがある
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
}

function safeRemoveStorageItem(key: string) {
    try {
        sessionStorage.removeItem(key);
    } catch {
        // ignore
    }
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

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
    
    // Read Aloud コントロール用の状態
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [sentences, setSentences] = useState<string[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const safeCancelSpeech = () => {
        try {
            // 一部モバイル/ブラウザでspeechSynthesisが未実装 or 例外になることがある
            const synth = (typeof window !== 'undefined' ? (window as any).speechSynthesis : null);
            if (synth && typeof synth.cancel === 'function') {
                synth.cancel();
            }
        } catch (e) {
            console.warn('[Session] speechSynthesis.cancel failed:', e);
        }
    };

    useEffect(() => {
        console.log('[Session] Page Mounted');
    }, []);

    // テキストを文単位で分割する関数
    const splitIntoSentences = (text: string): string[] => {
        // 文末記号（. ! ?）で分割
        // 正規表現で文末記号とその後の空白を検出
        const sentenceEndings = /([.!?]+)\s+/g;
        const sentences: string[] = [];
        let lastIndex = 0;
        let match;
        
        while ((match = sentenceEndings.exec(text)) !== null) {
            const sentence = text.substring(lastIndex, match.index + match[1].length).trim();
            if (sentence.length > 0) {
                sentences.push(sentence);
            }
            lastIndex = match.index + match[0].length;
        }
        
        // 残りのテキストを追加
        const remaining = text.substring(lastIndex).trim();
        if (remaining.length > 0) {
            sentences.push(remaining);
        }
        
        return sentences.length > 0 ? sentences : [text]; // 文が見つからない場合は全文を返す
    };

    // Read Aloud コントロール関数
    const playFromSentence = (index: number) => {
        if (!currentLesson || sentences.length === 0) return;
        
        safeCancelSpeech();
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentSentenceIndex(index);

        // 指定された文から最後までを結合して再生
        // NOTE: ローマ字変換 + 長文結合はモバイルで重くなりやすい。
        // まずは原文を読み上げる（必要なら「現在の1文のみ」+変換に変更する）。
        const textToSpeak = sentences.slice(index).join(' ');
        const textWithRomaji = textToSpeak;
        
        const UtteranceCtor = (typeof window !== 'undefined' ? (window as any).SpeechSynthesisUtterance : null);
        if (!UtteranceCtor) {
            console.warn('[Session] SpeechSynthesisUtterance is not available in this browser');
            setIsPlaying(false);
            setIsPaused(false);
            return;
        }

        const utterance = new UtteranceCtor(textWithRomaji) as SpeechSynthesisUtterance;
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        
        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentSentenceIndex(sentences.length);
        };
        
        utterance.onerror = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };
        
        utteranceRef.current = utterance;
        try {
            const synth = (typeof window !== 'undefined' ? (window as any).speechSynthesis : null);
            if (synth && typeof synth.speak === 'function') {
                synth.speak(utterance);
            } else {
                console.warn('[Session] speechSynthesis.speak is not available in this browser');
                setIsPlaying(false);
                setIsPaused(false);
            }
        } catch (e) {
            console.warn('[Session] speechSynthesis.speak failed:', e);
            setIsPlaying(false);
            setIsPaused(false);
        }
    };

    const pauseReading = () => {
        // speaking中のみpause（paused中はresumeへ）
        if (!isPlaying || isPaused) return;
        try {
            const synth = (typeof window !== 'undefined' ? (window as any).speechSynthesis : null);
            if (synth && typeof synth.pause === 'function') synth.pause();
            setIsPaused(true);
        } catch {
            // 一部環境でpauseが未対応の場合は停止にフォールバック
            stopReading();
        }
    };

    const resumeReading = () => {
        if (!isPlaying || !isPaused) return;
        try {
            const synth = (typeof window !== 'undefined' ? (window as any).speechSynthesis : null);
            if (synth && typeof synth.resume === 'function') synth.resume();
            setIsPaused(false);
        } catch {
            // うまくresumeできない場合は現在位置から再開
            playFromSentence(currentSentenceIndex);
        }
    };

    const stopReading = () => {
        safeCancelSpeech();
        setIsPlaying(false);
        setIsPaused(false);
        utteranceRef.current = null;
    };

    const rewindSentence = () => {
        if (currentSentenceIndex > 0) {
            playFromSentence(Math.max(0, currentSentenceIndex - 1));
        }
    };

    const forwardSentence = () => {
        if (currentSentenceIndex < sentences.length - 1) {
            playFromSentence(currentSentenceIndex + 1);
        }
    };

    // レッスンが変更されたら文を分割
    useEffect(() => {
        if (currentLesson?.content) {
            // NOTE: 本文全体のローマ字変換はモバイルでUIフリーズしやすい。
            // 読み上げ時に必要なら短い範囲で変換する。
            const splitSentences = splitIntoSentences(currentLesson.content);
            setSentences(splitSentences);
            setCurrentSentenceIndex(0);
            // レッスン切替時は音声を停止して状態をリセット
            stopReading();
        }
    }, [currentLesson]);

    // ページ離脱時に読み上げを停止
    useEffect(() => {
        return () => {
            safeCancelSpeech();
        };
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
                    const stored = safeGetStorageItem('selected_lesson');
                    if (stored) {
                        lessonData = normalizeLesson(JSON.parse(stored));
                    }
                }

                // 2) 互換: 旧URLクエリ lesson=...（残ってたら読む）
                if (!lessonData) {
                    const lessonParam = searchParams.get('lesson');
                    if (lessonParam) {
                        // URLSearchParamsは基本デコード済みなのでdecodeURIComponentしない
                        lessonData = normalizeLesson(JSON.parse(lessonParam));
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
                    safeRemoveStorageItem('selected_lesson');
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
            setLessons((response.lessons || []).map((l) => normalizeLesson(l)));
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
            const normalizedLesson = normalizeLesson(lesson);
            // LessonOptionをapi.startSessionが期待する形式に変換
            const customContent = {
                title: normalizedLesson.title,
                content: normalizedLesson.content,
                question:
                    normalizedLesson.question ||
                    (Array.isArray(normalizedLesson.discussion_a) ? normalizedLesson.discussion_a[0] : undefined) ||
                    'What are your thoughts on this article?'
            };
            
            const response = await api.startSession(undefined, customContent);
            setSessionId(response.session_id);
            setCurrentLesson(normalizedLesson);
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
                            {Array.isArray(currentLesson.vocabulary) && currentLesson.vocabulary.length > 0 && (
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
                                    <div className="flex items-center gap-2">
                                        {/* 巻き戻しボタン */}
                                        <button
                                            onClick={rewindSentence}
                                            disabled={!isPlaying && currentSentenceIndex === 0}
                                            className="flex items-center justify-center w-10 h-10 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-full text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="巻き戻し"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                            </svg>
                                        </button>
                                        
                                        {/* 再生/停止ボタン */}
                                        <button
                                            onClick={() => {
                                                if (!isPlaying) {
                                                    playFromSentence(currentSentenceIndex);
                                                    return;
                                                }
                                                if (isPaused) {
                                                    resumeReading();
                                                } else {
                                                    pauseReading();
                                                }
                                            }}
                                            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full text-sm font-semibold transition"
                                        >
                                            {isPlaying ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        {isPaused ? (
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                        ) : (
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                                                        )}
                                                    </svg>
                                                    <span>{isPaused ? '再開' : '一時停止'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Read Aloud</span>
                                                </>
                                            )}
                                        </button>

                                        {/* 停止（リセット）ボタン */}
                                        <button
                                            onClick={stopReading}
                                            disabled={!isPlaying}
                                            className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-full text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="停止"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                            </svg>
                                        </button>
                                        
                                        {/* 早送りボタン */}
                                        <button
                                            onClick={forwardSentence}
                                            disabled={!isPlaying && currentSentenceIndex >= sentences.length - 1}
                                            className="flex items-center justify-center w-10 h-10 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-full text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="早送り"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                                            </svg>
                                        </button>
                                    </div>
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
                                        {Array.isArray(currentLesson.discussion_a) && currentLesson.discussion_a.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-bold text-indigo-700 mb-2">Discussion B</h3>
                                    <ul className="list-disc list-inside space-y-2 text-gray-800">
                                        {Array.isArray(currentLesson.discussion_b) && currentLesson.discussion_b.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleStartRecording}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl shadow-md transition-transform hover:scale-105 flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                    <span>Start Recording / Discussion</span>
                                </button>
                                
                                {/* ディスカッションページに戻るボタン（一度録音ページに行ったことがある場合） */}
                                {transcript && (
                                    <button
                                        onClick={() => setStep('recording')}
                                        className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <span>ディスカッションに戻る</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'recording' && currentLesson && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="text-3xl font-bold text-gray-900">Discussion Phase</h1>
                                <button
                                    onClick={() => setStep('learning')}
                                    className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors font-semibold"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>記事に戻る</span>
                                </button>
                            </div>
                            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded mb-6">
                                <p className="text-lg text-gray-800 font-bold mb-2">Topic: {currentLesson.title}</p>
                                <p className="text-gray-600">Please answer any of the discussion questions or share your thoughts on the article.</p>
                            </div>
                            <AudioRecorder
                                onTranscriptChange={setTranscript}
                                onDurationChange={setDuration}
                            />
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!transcript}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                                >
                                    解析を開始 (Submit for Feedback)
                                </button>
                                <button 
                                    onClick={() => setStep('learning')} 
                                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>記事を振り返る</span>
                                </button>
                            </div>
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
