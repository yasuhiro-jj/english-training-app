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
    const [step, setStep] = useState<'input' | 'selection' | 'learning' | 'recording' | 'analyzing' | 'complete' | 'preparing'>('input');
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
    const [isStarting, setIsStarting] = useState(false);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [sentences, setSentences] = useState<string[]>([]);
    const [readAloudError, setReadAloudError] = useState('');
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const playbackIdRef = useRef(0);
    const stopRequestedRef = useRef(false);
    const pauseRequestedRef = useRef(false);
    const pausedSentenceIndexRef = useRef<number | null>(null);
    const sentencesRef = useRef<string[]>([]);
    const voicesCacheRef = useRef<SpeechSynthesisVoice[] | null>(null);
    const speakWatchdogRef = useRef<number | null>(null);

    useEffect(() => {
        sentencesRef.current = sentences;
    }, [sentences]);

    const getUA = () => (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');

    const getSpeechSynthesis = (): SpeechSynthesis | null => {
        if (typeof window === 'undefined') return null;
        const w: any = window as any;
        // Some environments expose it on globalThis but not window (or vice versa).
        return (w.speechSynthesis || (globalThis as any).speechSynthesis || null) as SpeechSynthesis | null;
    };

    const safeCancelSpeech = () => {
        try {
            // 一部モバイル/ブラウザでspeechSynthesisが未実装 or 例外になることがある
            const synth = getSpeechSynthesis();
            if (synth && typeof synth.cancel === 'function') {
                synth.cancel();
            }
        } catch (e) {
            console.warn('[Session] speechSynthesis.cancel failed:', e);
        }
    };

    const clearSpeakWatchdog = () => {
        if (speakWatchdogRef.current) {
            window.clearTimeout(speakWatchdogRef.current);
            speakWatchdogRef.current = null;
        }
    };

    useEffect(() => {
        console.log('[Session] Page Mounted');
    }, []);

    // テキストを文単位で分割する関数
    const splitIntoSentences = (text: string): string[] => {
        // 文末記号（. ! ?）で分割
        // 正規表現で文末記号とその後の空白を検出
        // 改行も考慮して分割
        const normalizedText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        const sentenceEndings = /([.!?]+)\s+/g;
        const sentences: string[] = [];
        let lastIndex = 0;
        let match;
        
        while ((match = sentenceEndings.exec(normalizedText)) !== null) {
            const sentence = normalizedText.substring(lastIndex, match.index + match[1].length).trim();
            if (sentence.length > 0) {
                sentences.push(sentence);
            }
            lastIndex = match.index + match[0].length;
        }
        
        // 残りのテキストを追加
        const remaining = normalizedText.substring(lastIndex).trim();
        if (remaining.length > 0) {
            sentences.push(remaining);
        }
        
        return sentences.length > 0 ? sentences : [normalizedText]; // 文が見つからない場合は全文を返す
    };

    const pickEnglishVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined => {
        const isBad = (v: SpeechSynthesisVoice) =>
            /eSpeak|Festival|flite/i.test(v.name || "");

        const candidates = voices.filter((v) => v.lang?.startsWith("en") && !isBad(v));

        // Prefer en-US first, then en-GB, then any en-*
        const preferLang = (langPrefix: string) => candidates.filter((v) => v.lang?.startsWith(langPrefix));

        const score = (v: SpeechSynthesisVoice) => {
            const name = v.name || "";
            // Heuristics: many browsers have higher quality voices labeled like these
            if (/Google US English/i.test(name)) return 100;
            if (/Google/i.test(name)) return 90;
            if (/Microsoft/i.test(name)) return 80;
            if (/Natural/i.test(name)) return 70;
            if (v.localService === false) return 60;
            return 50;
        };

        const byScoreDesc = (arr: SpeechSynthesisVoice[]) => [...arr].sort((a, b) => score(b) - score(a));

        const us = byScoreDesc(preferLang("en-US"));
        if (us.length) return us[0];
        const gb = byScoreDesc(preferLang("en-GB"));
        if (gb.length) return gb[0];
        const any = byScoreDesc(candidates);
        return any[0];
    };

    const getVoicesWithWait = async (synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> => {
        try {
            const initial = synth.getVoices();
            if (initial && initial.length > 0) return initial;
        } catch {
            // ignore
        }

        // Wait for onvoiceschanged (Chrome) but time out to avoid hanging
        return await new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                try {
                    resolve(synth.getVoices() || []);
                } catch {
                    resolve([]);
                }
            };

            // Increase timeout for mobile browsers which may take longer to load voices
            const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '');
            const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
            const timeout = isMobile ? 2000 : 1200;
            const timer = setTimeout(() => {
                synth.onvoiceschanged = null;
                finish();
            }, timeout);

            synth.onvoiceschanged = () => {
                clearTimeout(timer);
                synth.onvoiceschanged = null;
                finish();
            };
        });
    };

    const buildSpeechChunk = (startIndex: number, maxChars = 260, maxSentences = 3) => {
        const list = sentencesRef.current || [];
        let text = "";
        let idx = Math.max(0, startIndex);
        let added = 0;

        while (idx < list.length && added < maxSentences) {
            const s = (list[idx] || "").trim();
            if (!s) {
                idx += 1;
                continue;
            }
            const candidate = text ? `${text} ${s}` : s;
            // Always include at least 1 sentence
            if (added > 0 && candidate.length > maxChars) break;
            text = candidate;
            idx += 1;
            added += 1;
        }

        return { text, nextIndex: idx };
    };

    // Read Aloud コントロール関数
    const playFromSentence = (index: number) => {
        if (!currentLesson || sentences.length === 0) return;

        // Check if speech synthesis is available
        const synth = getSpeechSynthesis();
        if (!synth || typeof synth.speak !== 'function') {
            console.warn('[Session] speechSynthesis is not available');
            const ua = getUA();
            const isInApp =
                /Line\//i.test(ua) ||
                /FBAN|FBAV/i.test(ua) ||
                /Instagram/i.test(ua) ||
                /Twitter/i.test(ua);
            setReadAloudError(
                isInApp
                    ? 'アプリ内ブラウザでは音声読み上げが使えないことがあります。右上メニューから「Safariで開く / Chromeで開く」をお試しください。'
                    : 'このブラウザでは音声読み上げ（Read Aloud）が利用できません。Safari/Chromeでお試しください。'
            );
            return;
        }

        setReadAloudError('');

        // Kick off voice loading (do not await; keep user-gesture sync)
        if (!voicesCacheRef.current) {
            try {
                const v = synth.getVoices?.() || [];
                if (v.length > 0) voicesCacheRef.current = v;
                else {
                    void getVoicesWithWait(synth).then((vv) => {
                        if (vv && vv.length > 0) voicesCacheRef.current = vv;
                    });
                }
            } catch {
                // ignore
            }
        }

        // 直前の再生を無効化（onendの連鎖を止める）
        playbackIdRef.current += 1;
        stopRequestedRef.current = false;
        pauseRequestedRef.current = false;
        pausedSentenceIndexRef.current = null;

        clearSpeakWatchdog();
        safeCancelSpeech();
        // Start as "starting" until onstart fires (important for mobile UX)
        setIsStarting(true);
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(Math.max(0, Math.min(index, sentences.length - 1)));

        const playbackId = playbackIdRef.current;

        const speakSentence = (i: number) => {
            if (stopRequestedRef.current) return;
            if (pauseRequestedRef.current) return;
            if (playbackId !== playbackIdRef.current) return;

            const list = sentencesRef.current;
            if (!list || list.length === 0) return;

            if (i >= list.length) {
                setIsStarting(false);
                setIsPlaying(false);
                setIsPaused(false);
                setCurrentSentenceIndex(list.length);
                return;
            }

            const { text, nextIndex } = buildSpeechChunk(i);
            if (!text) {
                setCurrentSentenceIndex(Math.min(list.length, i + 1));
                speakSentence(i + 1);
                return;
            }

            const UtteranceCtor = (typeof window !== 'undefined' ? (window as any).SpeechSynthesisUtterance : null);
            if (!UtteranceCtor) {
                console.warn('[Session] SpeechSynthesisUtterance is not available in this browser');
                setIsPlaying(false);
                setIsPaused(false);
                return;
            }

            const synth = getSpeechSynthesis();
            if (!synth || typeof synth.speak !== 'function') {
                console.warn('[Session] speechSynthesis.speak is not available in this browser');
                setIsPlaying(false);
                setIsPaused(false);
                setReadAloudError('音声読み上げ（Read Aloud）が利用できません。Safari/Chromeでお試しください。');
                return;
            }

            const utterance = new UtteranceCtor(text) as SpeechSynthesisUtterance;
            // Naturalness tuning: sentence-by-sentence + modest pace
            utterance.lang = 'en-US';
            utterance.rate = 0.92;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onend = () => {
                if (stopRequestedRef.current) return;
                if (playbackId !== playbackIdRef.current) return;
                clearSpeakWatchdog();

                setCurrentSentenceIndex(nextIndex);

                if (nextIndex >= (sentencesRef.current?.length || 0)) {
                    setIsStarting(false);
                    setIsPlaying(false);
                    setIsPaused(false);
                    return;
                }

                // Small pause between chunks improves naturalness
                setTimeout(() => speakSentence(nextIndex), 220);
            };

            utterance.onerror = (e) => {
                // 一時停止によるcancel()でエラーが発生することがあるため、一時停止中はエラーを無視
                if (pauseRequestedRef.current) {
                    console.log('[Session] Ignoring error during pause');
                    return;
                }
                // stopRequestedがtrueの場合は、ユーザーが停止を要求したためエラーを無視
                if (stopRequestedRef.current) {
                    return;
                }
                // playbackIdが一致しない場合は、新しい再生が開始されているためエラーを無視
                if (playbackId !== playbackIdRef.current) {
                    return;
                }
                console.error('[Session] Speech synthesis error:', e);
                clearSpeakWatchdog();
                setIsStarting(false);
                setIsPlaying(false);
                setIsPaused(false);
                setReadAloudError('音読中にエラーが発生しました。別ブラウザ（Safari/Chrome）でお試しください。');
            };

            utterance.onstart = () => {
                // iOS などで start が発火しないケースの検知にも使う
                clearSpeakWatchdog();
                setIsStarting(false);
                setIsPlaying(true);
                setIsPaused(false);
            };

            utteranceRef.current = utterance;

            // IMPORTANT (mobile): speechSynthesis.speak MUST be called synchronously
            // from the user gesture chain. Do NOT await before calling speak().
            try {
                const ua = getUA();
                const isIOS = /iPad|iPhone|iPod/i.test(ua);
                // iOS Safari is prone to silent failures when explicitly setting utterance.voice.
                // Prefer letting it choose the default voice on iOS.
                if (!isIOS) {
                    const voices = voicesCacheRef.current || (synth.getVoices?.() || []);
                    const v = pickEnglishVoice(voices);
                    if (v) utterance.voice = v;
                }
            } catch {
                // ignore
            }

            try {
                // Some mobile browsers get "stuck paused" and require resume()
                try {
                    if (typeof synth.resume === 'function') synth.resume();
                } catch {
                    // ignore
                }
                synth.speak(utterance);
            } catch (e) {
                console.warn('[Session] speechSynthesis.speak failed:', e);
                setIsStarting(false);
                setIsPlaying(false);
                setIsPaused(false);
                setReadAloudError('音読を開始できませんでした。スマホの場合は「消音解除」や音量、または別ブラウザ（Safari/Chrome）をお試しください。');
                return;
            }

            // Watchdog: if speaking never starts, unblock UI and show message.
            clearSpeakWatchdog();
            speakWatchdogRef.current = window.setTimeout(() => {
                if (stopRequestedRef.current) return;
                if (playbackId !== playbackIdRef.current) return;
                // 一時停止中はエラーを表示しない
                if (pauseRequestedRef.current) return;
                try {
                    if (!synth.speaking && !synth.pending) {
                        setIsStarting(false);
                        setIsPlaying(false);
                        setIsPaused(false);
                        setReadAloudError('音読が開始できませんでした。スマホの場合は「消音解除」や音量、または別ブラウザ（Safari/Chrome）をお試しください。');
                    }
                } catch {
                    // ignore
                }
            }, 900);
        };

        speakSentence(Math.max(0, Math.min(index, sentences.length - 1)));
    };

    const pauseReading = () => {
        // speaking中のみpause（paused中はresumeへ）
        if (isStarting) return;
        if (!isPlaying || isPaused) return;
        try {
            const synth = getSpeechSynthesis();
            // pause/resumeは多くのブラウザで信頼性が低いため、cancelして現在位置を保持する方法に変更
            // これにより、再開時に確実に現在位置から再開できる
            // 現在の文のインデックスを ref に保存（state のクロージャ問題を回避）
            pausedSentenceIndexRef.current = currentSentenceIndex;
            pauseRequestedRef.current = true;
            safeCancelSpeech();
            setIsPaused(true);
            setIsPlaying(false);
            // utteranceRefをクリアして、次回の再生時に新しいutteranceを作成できるようにする
            utteranceRef.current = null;
        } catch {
            // エラー時も現在位置を保持して停止
            pausedSentenceIndexRef.current = currentSentenceIndex;
            pauseRequestedRef.current = true;
            safeCancelSpeech();
            setIsPaused(true);
            setIsPlaying(false);
            utteranceRef.current = null;
        }
    };

    const resumeReading = () => {
        // 一時停止中の場合のみ再開
        if (!isPaused) return;
        // 一時停止時に保存した文のインデックスから再開
        // pausedSentenceIndexRef が null の場合は、現在の currentSentenceIndex を使用
        const resumeIndex = pausedSentenceIndexRef.current !== null 
            ? pausedSentenceIndexRef.current 
            : currentSentenceIndex;
        pauseRequestedRef.current = false;
        pausedSentenceIndexRef.current = null;
        setIsPaused(false);
        playFromSentence(resumeIndex);
    };

    const stopReading = () => {
        stopRequestedRef.current = true;
        pauseRequestedRef.current = false;
        pausedSentenceIndexRef.current = null;
        playbackIdRef.current += 1;
        clearSpeakWatchdog();
        safeCancelSpeech();
        setIsStarting(false);
        setIsPlaying(false);
        setIsPaused(false);
        utteranceRef.current = null;
    };

    const rewindSentence = () => {
        // 再生中または一時停止中でも巻き戻し可能にする
        if (sentences.length === 0) return;
        const targetIndex = Math.max(0, currentSentenceIndex - 1);
        if (targetIndex !== currentSentenceIndex) {
            // 再生中なら停止してから巻き戻し
            if (isPlaying || isPaused) {
                safeCancelSpeech();
                setIsPlaying(false);
                setIsPaused(false);
            }
            playFromSentence(targetIndex);
        }
    };

    const forwardSentence = () => {
        // 再生中または一時停止中でも早送り可能にする
        if (sentences.length === 0) return;
        const targetIndex = Math.min(sentences.length - 1, currentSentenceIndex + 1);
        if (targetIndex !== currentSentenceIndex && targetIndex < sentences.length) {
            // 再生中なら停止してから早送り
            if (isPlaying || isPaused) {
                safeCancelSpeech();
                setIsPlaying(false);
                setIsPaused(false);
            }
            playFromSentence(targetIndex);
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
            // URLパラメータから難易度を取得（デフォルトは2=中級）
            const levelParam = searchParams.get('level');
            const level = levelParam ? parseInt(levelParam, 10) : 2;
            console.log('[Session] Generating lessons with level:', level);
            const response = await api.generateLessons(level);
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
            // セッション開始中の状態が分かるように一時的に preparing を使う
            setStep('preparing');
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
                    <a href="/dashboard" className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>ダッシュボードに戻る</span>
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
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">今日のレッスンを作成</h1>
                            <p className="text-gray-600 mb-8">
                                新聞のトップニュースから、あなただけの英会話レッスンを生成します。
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
                            <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-6">レッスンを選んでください</h2>
                            <p className="text-center text-gray-600 mb-4">
                                元記事: {lessons[0]?.japanese_title}
                            </p>

                            <div className="grid md:grid-cols-2 gap-6">
                                {lessons.map((lesson, index) => (
                                    <div key={index} className="border-2 border-gray-100 hover:border-indigo-500 rounded-xl p-6 transition-all hover:shadow-md cursor-pointer group" onClick={() => handleSelectLesson(lesson)}>
                                        <div className="flex justify-between items-start mb-4 gap-2">
                                            <span className={`px-3 py-1.5 sm:py-1 rounded-full text-sm sm:text-xs font-bold whitespace-nowrap ${
                                                lesson.level === '1' ? 'bg-green-100 text-green-800' :
                                                lesson.level === '2' ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {lesson.level === '1' ? '初心者' :
                                                lesson.level === '2' ? '中級者' :
                                                '上級者'}
                                            </span>
                                            <span className="text-xs sm:text-xs text-gray-500 truncate">{lesson.category}</span>
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

                    {step === 'preparing' && ( // 新しいpreparingステップのUI
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-xl text-gray-700">レッスンを準備中...</p>
                            <p className="text-sm text-gray-500 mt-2">これには数秒かかる場合があります。</p>
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
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
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
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 border-l-4 border-indigo-500 pl-3">Article</h2>
                                    <div className="flex items-center gap-2">
                                        {/* 巻き戻しボタン */}
                                        <button
                                            onClick={rewindSentence}
                                            disabled={isStarting || sentences.length === 0 || currentSentenceIndex === 0}
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
                                                if (!isPlaying && !isStarting) {
                                                    playFromSentence(currentSentenceIndex);
                                                    return;
                                                }
                                                if (isStarting) {
                                                    // If starting but no audio yet, allow user to cancel
                                                    stopReading();
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
                                            {isStarting ? (
                                                <>
                                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                    </svg>
                                                    <span>準備中…</span>
                                                </>
                                            ) : isPlaying ? (
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
                                            disabled={!isPlaying && !isStarting}
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
                                            disabled={isStarting || sentences.length === 0 || currentSentenceIndex >= sentences.length - 1}
                                            className="flex items-center justify-center w-10 h-10 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-full text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="早送り"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                {readAloudError && (
                                    <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                                        {readAloudError}
                                    </div>
                                )}
                                <div className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                                    {currentLesson.content}
                                </div>
                            </div>

                            {/* Viewpoint Discussion */}
                            <div className="bg-indigo-50 rounded-lg p-6">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Viewpoint Discussion</h2>

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
                                <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Discussion Phase</h1>
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
                            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 sm:p-6 rounded mb-6">
                                <p className="text-base sm:text-lg text-gray-800 font-bold mb-2">Topic: {currentLesson.title}</p>
                                <p className="text-gray-600">Please answer any of the discussion questions or share your thoughts on the article.</p>
                            </div>
                            <AudioRecorder
                                onTranscriptChange={setTranscript}
                                onDurationChange={setDuration}
                                sessionId={sessionId}
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
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">完了！</h1>
                            <div className="bg-green-50 border-l-4 border-green-500 p-4 sm:p-6 rounded">
                                <p className="text-base sm:text-lg text-gray-800">{analysisResult.message}</p>
                                <p className="text-sm text-gray-600 mt-2">
                                    フィードバック件数: {analysisResult.feedback_count}件
                                </p>
                            </div>

                            {/* Feedback Items List */}
                            {analysisResult.feedback_items && analysisResult.feedback_items.length > 0 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 border-b pb-2">フィードバック詳細</h2>
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
