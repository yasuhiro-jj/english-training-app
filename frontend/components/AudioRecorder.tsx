'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';

interface AudioRecorderProps {
    onTranscriptChange: (transcript: string) => void;
    onDurationChange: (duration: number) => void;
    sessionId?: string; // Whisper API用のセッションID
}

export default function AudioRecorder({ onTranscriptChange, onDurationChange, sessionId = '' }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [duration, setDuration] = useState(0);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [micWarning, setMicWarning] = useState(false);
    const [lang, setLang] = useState('en-US');
    const [statusMsg, setStatusMsg] = useState('待機中');
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [debugEnabled, setDebugEnabled] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    
    // Whisper関連のstate
    const [useWhisper, setUseWhisper] = useState(true); // Whisper使用フラグ（デフォルト: true）
    const [whisperRemainingMinutes, setWhisperRemainingMinutes] = useState<number | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    
    // MediaRecorder関連のref
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);

    const recognitionRef = useRef<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isRecordingRef = useRef(false);
    const isStartingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const debugEnabledRef = useRef(false);
    const lastFinalRef = useRef<string>('');
    const lastInterimRef = useRef<string>('');
    const lastOnResultLogAtRef = useRef<number>(0);
    const whisperStreamRef = useRef<MediaStream | null>(null); // Whisper用のストリーム

    const isDev = process.env.NODE_ENV === 'development';

    function safeStringify(value: unknown): string {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    const logEvent = (message: string, data?: unknown) => {
        // NOTE: ハンドラが古いクロージャを掴んでもログできるようにref参照にする
        if (!debugEnabledRef.current && !isDev) return;
        const ts = new Date().toISOString();
        const payload = data === undefined ? '' : ` ${safeStringify(data)}`;
        const line = `[${ts}] ${message}${payload}`;
        if (isDev) console.log(line);
        setDebugLogs((prev) => {
            const next = [...prev, line];
            return next.length > 200 ? next.slice(next.length - 200) : next;
        });
    };

    useEffect(() => {
        // スマホでも原因特定できるように ?debug=1 でログを表示
        try {
            const params = new URLSearchParams(window.location.search);
            const enabled =
                params.get('debug') === '1' ||
                params.get('debug') === 'true' ||
                localStorage.getItem('dne_debug') === '1';
            setDebugEnabled(Boolean(enabled));
            debugEnabledRef.current = Boolean(enabled);
        } catch {
            setDebugEnabled(false);
            debugEnabledRef.current = false;
        }
    }, []);

    const getSpeechRecognitionCtor = () => {
        if (typeof window === 'undefined') return null;
        return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
    };

    const supportsSpeechRecognition = () => !!getSpeechRecognitionCtor();

    const supportsGetUserMedia = () =>
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';

    const supportsMediaRecorder = () => {
        return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported;
    };

    const getDomExceptionName = (err: unknown): string => {
        if (err && typeof err === 'object' && 'name' in err && typeof (err as any).name === 'string') {
            return (err as any).name;
        }
        return '';
    };

    const getMicrophonePermissionState = async (): Promise<string | null> => {
        try {
            const perms: any = (navigator as any).permissions;
            if (!perms?.query) return null;
            // TSのPermissionNameは環境差があるので any で扱う
            const res = await perms.query({ name: 'microphone' });
            return res?.state ?? null; // 'granted' | 'denied' | 'prompt'
        } catch {
            return null;
        }
    };

    // デバイス一覧の取得
    const refreshDevices = async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioIn = allDevices.filter(d => d.kind === 'audioinput');
            setDevices(audioIn);
            if (audioIn.length > 0 && !selectedDeviceId) {
                // デフォルトを選択
                setSelectedDeviceId(audioIn[0].deviceId);
            }
        } catch (e) {
            if (isDev) console.error('Error listing devices:', e);
        }
    };

    // 初期化時にマイクチェックを開始 & デバイス取得
    useEffect(() => {
        refreshDevices();
        // NOTE: モバイルではユーザー操作なしの getUserMedia() がブロックされるため、
        // ここでマイク取得はしない（録音開始ボタン押下時に初めて起動する）
        return () => stopAudioMonitoring();
    }, []);

    const onTranscriptChangeRef = useRef(onTranscriptChange);
    const onDurationChangeRef = useRef(onDurationChange);

    useEffect(() => {
        onTranscriptChangeRef.current = onTranscriptChange;
        onDurationChangeRef.current = onDurationChange;
    }, [onTranscriptChange, onDurationChange]);

    // 言語変更時に録音中なら再起動する
    const prevLangRef = useRef(lang);
    useEffect(() => {
        if (prevLangRef.current !== lang && isRecordingRef.current && recognitionRef.current) {
            console.log('Language changed from', prevLangRef.current, 'to', lang, '- restarting recognition');
            // 一度停止してから新しい言語で再起動
            const wasRecording = isRecordingRef.current;
            try {
                recognitionRef.current.stop();
                // onend ハンドラーが自動的に再起動する（isRecordingRef.current が true のため）
                // ただし、新しいインスタンスが作成されるまで待つ必要がある
                setTimeout(() => {
                    if (wasRecording && recognitionRef.current) {
                        recognitionRef.current.lang = lang;
                        try {
                            recognitionRef.current.start();
                            console.log('Recognition restarted with new language:', lang);
                        } catch (e) {
                            console.log('Error restarting recognition with new language:', e);
                        }
                    }
                }, 500);
            } catch (e) {
                console.log('Error stopping recognition for language change:', e);
            }
        }
        prevLangRef.current = lang;
    }, [lang]);

    const attachRecognitionHandlers = (rec: any) => {
        rec.onresult = (event: any) => {
            // Android Chrome の SpeechRecognition は同じ確定文を繰り返し返すことがあるため、
            // 「差分を足す」ではなく「event.results から確定文を再構築」して重複を防ぐ。
            let fullFinal = '';
            let currentInterim = '';

            for (let i = 0; i < event.results.length; i++) {
                const t = event.results[i][0]?.transcript || '';
                if (event.results[i].isFinal) {
                    fullFinal += t + ' ';
                } else if (i >= event.resultIndex) {
                    // 直近のinterimのみ反映
                    currentInterim += t;
                }
            }

            const finalText = fullFinal.trim();
            // 同じ内容なら更新しない（Androidでイベントが多いため）
            const prevFinal = lastFinalRef.current;
            const prevInterim = lastInterimRef.current;
            if (finalText === prevFinal && currentInterim === prevInterim) {
                return;
            }
            lastFinalRef.current = finalText;
            lastInterimRef.current = currentInterim;

            setInterimTranscript(currentInterim);
            if (currentInterim || finalText) {
                setMicWarning(false);
                setStatusMsg('音声を収集中...');
            }

            if (finalText) {
                setTranscript(finalText);
                setTimeout(() => onTranscriptChangeRef.current(finalText), 0);
            }

            // デバッグログは出しすぎると見づらいので間引く（最大1秒に1回＋finalが伸びた時）
            const now = Date.now();
            const shouldLog =
                finalText.length !== prevFinal.length &&
                (now - lastOnResultLogAtRef.current > 1000 || lastOnResultLogAtRef.current === 0);
            if (shouldLog) {
                lastOnResultLogAtRef.current = now;
                logEvent('SpeechRecognition onresult', {
                    resultIndex: event.resultIndex,
                    resultsLength: event.results?.length,
                    finalLen: finalText.length,
                    interimLen: currentInterim.length,
                });
            }
        };

        rec.onstart = () => {
                if (isDev) console.log('Speech recognition engine ONSTART');
                setStatusMsg('聞き取り中...');
                isStartingRef.current = false;
                logEvent('SpeechRecognition onstart');
            };

        rec.onerror = (event: any) => {
                if (isDev) console.error('Speech recognition error event:', event.error);
                logEvent('SpeechRecognition onerror', { error: event.error });
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    // Ignore these and let onend handle restart
                    return;
                }
                if (event.error === 'not-allowed') {
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    void (async () => {
                        const p = await getMicrophonePermissionState();
                        setStatusMsg(
                            p === 'denied'
                                ? 'マイク権限が「ブロック」されています（Chromeのサイト設定でマイクを許可→再読み込み）'
                                : '音声認識が拒否されました（Chromeのサイト設定/OSのマイク権限をご確認ください）'
                        );
                        logEvent('SpeechRecognition denied', { permissionState: p });
                    })();
                    // NOTE: alert はモバイルで固まりやすいので使わない
                    stopAudioMonitoring();
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    setInterimTranscript('');
                    return;
                }
                if (event.error === 'audio-capture') {
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    setStatusMsg('マイク入力を開始できませんでした（他アプリがマイク使用中の可能性）');
                    logEvent('SpeechRecognition audio-capture');
                    stopAudioMonitoring();
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    setInterimTranscript('');
                    return;
                }
                if (event.error === 'service-not-allowed') {
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    setStatusMsg('音声認識がブロックされました（端末/ポリシー設定をご確認ください）');
                    return;
                }
                if (event.error === 'network') {
                    setStatusMsg('音声認識のネットワークエラー（通信状況をご確認ください）');
                }
            };

        rec.onend = () => {
                if (isDev) console.log('Speech recognition engine ONEND');
                if (isRecordingRef.current) {
                    // Persistent restart logic (300ms delay for stability)
                    setTimeout(() => {
                        try {
                            if (isRecordingRef.current) {
                                rec.start();
                                if (isDev) console.log('Recognition restarted successfully');
                            }
                        } catch (e) {
                            if (isDev) console.log('Recognition restart attempt failed:', e);
                        }
                    }, 300);
                } else {
                    setStatusMsg('待機中');
                }
            };
    };

    const ensureRecognition = (): any | null => {
        const SpeechRecognition = getSpeechRecognitionCtor();
        if (typeof window === 'undefined' || !SpeechRecognition) return null;

        // 既存インスタンスがあれば再利用。ただしハンドラが無い（＝競合生成）場合は付け直す
        if (recognitionRef.current) {
            if (!recognitionRef.current.onstart || !recognitionRef.current.onerror || !recognitionRef.current.onend) {
                attachRecognitionHandlers(recognitionRef.current);
            }
            return recognitionRef.current;
        }

        if (isDev) console.log('Creating SpeechRecognition instance for lang:', lang);
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = lang;
        attachRecognitionHandlers(rec);
        recognitionRef.current = rec;
        return rec;
    };

    useEffect(() => {
        // Web Speech API の初期化（可能なら先に作っておく）
        ensureRecognition();

        return () => {
            if (isDev) console.log('Cleaning up SpeechRecognition engine');
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.onresult = null;
                    recognitionRef.current.onerror = null;
                    recognitionRef.current.onend = null;
                    recognitionRef.current.onstart = null;
                    recognitionRef.current.stop();
                } catch (e) { }
            }
        };
    }, [lang]);

    const startAudioMonitoring = async (force: boolean = true): Promise<boolean> => {
        if (streamRef.current && !force) {
            if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
                if (isDev) console.log('AudioContext resumed from suspended state (non-force start)');
            }
            return true;
        }

        try {
            if (!supportsGetUserMedia()) {
                setStatusMsg('このブラウザはマイク入力に未対応です');
                logEvent('getUserMedia unsupported');
                return false;
            }

            if (isDev) console.log('Requesting microphone access with deviceId:', selectedDeviceId);
            const constraints = {
                // exact は端末によって失敗しやすいので ideal にする
                audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (isDev) console.log('Microphone access granted. Stream:', stream.id, 'Active:', stream.active);
            logEvent('getUserMedia success', { active: stream.active });
            streamRef.current = stream;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;
            if (isDev) console.log('AudioContext created. State:', audioContext.state);

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
                if (isDev) console.log('AudioContext resumed. New state:', audioContext.state);
            }

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            let lastLogTime = 0;

            const checkVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const average = sum / bufferLength;

                // 感度を適正化 (4倍から1.5倍に下げ、実際の感度を把握しやすくする)
                setAudioLevel(average * 1.5);

                const now = Date.now();
                if (now - lastLogTime > 1000) {
                    if (average < 0.2) {
                        if (isDev) console.log('Audio level TOO LOW:', average.toFixed(2));
                    } else {
                        if (isDev) console.log('Current audio level (avg):', average.toFixed(2));
                    }
                    lastLogTime = now;
                }

                if (average > 0.3 && isRecordingRef.current) {
                    setMicWarning(false);
                } else if (average < 0.1 && isRecordingRef.current) {
                    setMicWarning(true); // 低すぎる場合に警告
                }

                animationFrameRef.current = requestAnimationFrame(checkVolume);
            };

            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            checkVolume();
            return true;
        } catch (err) {
            const name = getDomExceptionName(err);
            if (isDev) console.error('Error accessing microphone:', err, 'name:', name);
            logEvent('getUserMedia failed', { name, err: String(err) });
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                const perm = await getMicrophonePermissionState();
                setStatusMsg(
                    perm === 'denied'
                        ? 'マイク権限が「ブロック」されています（Chromeのサイト設定でマイクを許可してください）'
                        : 'マイク権限が拒否されました（Chromeのサイト設定でマイクを許可してください）'
                );
            } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                setStatusMsg('マイクが見つかりません（端末のマイク設定をご確認ください）');
            } else if (name === 'NotReadableError' || name === 'TrackStartError') {
                setStatusMsg('マイクを使用できません（他アプリが使用中の可能性）');
            } else {
                setStatusMsg('マイクアクセスエラー');
            }
            return false;
        }
    };

    const stopAudioMonitoring = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioLevel(0);
    };

    // Blobをbase64に変換する関数
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Whisper用の録音開始
    const startRecordingWithWhisper = async () => {
        if (!supportsGetUserMedia()) {
            setStatusMsg('このブラウザは録音に未対応です');
            setUseWhisper(false);
            await startRecordingWithDeviceSTT();
            return;
        }

        // MediaRecorderのサポート確認
        if (!supportsMediaRecorder()) {
            logEvent('MediaRecorder not supported, falling back to device STT');
            setStatusMsg('このブラウザはWhisperモードに未対応です。端末STTモードに切り替えます');
            setUseWhisper(false);
            await startRecordingWithDeviceSTT();
            return;
        }

        try {
            const constraints = {
                audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            whisperStreamRef.current = stream;

            // MediaRecorderの初期化（スマホ対応のMIMEタイプチェック）
            let mimeType = 'audio/webm'; // デフォルト
            
            // iOS Safari対応（audio/mp4を優先）
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            if (isIOS || isSafari) {
                // iOS Safariはaudio/mp4またはaudio/aacをサポート
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/aac')) {
                    mimeType = 'audio/aac';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                }
            } else {
                // Android Chromeなど
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus';
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                }
            }
            
            logEvent('MediaRecorder MIME type selected', { mimeType, isIOS, isSafari });

            let recorder: MediaRecorder;
            try {
                recorder = new MediaRecorder(stream, { mimeType });
            } catch (mimeError: any) {
                // MIMEタイプがサポートされていない場合、デフォルトで再試行
                logEvent('MediaRecorder creation failed with mimeType, trying default', { mimeType, error: String(mimeError) });
                try {
                    recorder = new MediaRecorder(stream); // MIMEタイプ指定なしで再試行
                } catch (defaultError: any) {
                    logEvent('MediaRecorder creation failed completely', { error: String(defaultError) });
                    setStatusMsg('録音の開始に失敗しました。端末STTモードに切り替えます');
                    setUseWhisper(false);
                    stream.getTracks().forEach(track => track.stop());
                    await startRecordingWithDeviceSTT();
                    return;
                }
            }
            
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    logEvent('MediaRecorder data available', { size: event.data.size, type: event.data.type });
                }
            };
            
            recorder.onerror = (event: any) => {
                logEvent('MediaRecorder error', { error: event.error || 'Unknown error' });
                setStatusMsg('録音エラーが発生しました。端末STTモードに切り替えます');
                setUseWhisper(false);
                setIsRecording(false);
                isRecordingRef.current = false;
            };

            recorder.onstop = () => {
                // 録音停止時の処理はstopRecordingWithWhisperで実装
                // ここでは何もしない（setTimeoutで処理するため）
            };

            mediaRecorderRef.current = recorder;
            recordingStartTimeRef.current = Date.now();
            recorder.start();
            
            setIsRecording(true);
            isRecordingRef.current = true;
            setStatusMsg('Whisper高精度モードで録音中...');
            setTranscript('');
            setInterimTranscript('');

            // タイマー開始
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);

            logEvent('Whisper recording started');
        } catch (err: any) {
            const name = getDomExceptionName(err);
            logEvent('Whisper recording start failed', { name, err: String(err) });
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                setStatusMsg('マイク権限が拒否されました');
            } else {
                setStatusMsg('録音の開始に失敗しました');
            }
            // エラー時は端末STTにフォールバック
            setUseWhisper(false);
            startRecording();
        }
    };

    // Whisper用の録音停止と文字起こし
    const stopRecordingWithWhisper = async () => {
        if (!mediaRecorderRef.current || !isRecordingRef.current) {
            return;
        }

        isRecordingRef.current = false;
        setIsRecording(false);
        setIsTranscribing(true);
        setStatusMsg('文字起こし中...');

        // MediaRecorderを停止
        if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // タイマー停止
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // ストリームを停止
        if (whisperStreamRef.current) {
            whisperStreamRef.current.getTracks().forEach(track => track.stop());
            whisperStreamRef.current = null;
        }

        // 録音データを処理（MediaRecorderのonstopイベントを待つ）
        const processRecording = async () => {
            try {
                // audioChunksが空の場合はエラー
                if (audioChunksRef.current.length === 0) {
                    throw new Error('録音データが取得できませんでした');
                }
                
                const blob = new Blob(audioChunksRef.current, { 
                    type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
                });
                
                logEvent('Blob created', { size: blob.size, type: blob.type });
                
                if (blob.size === 0) {
                    throw new Error('録音データが空です');
                }
                
                const durationSeconds = duration;
                const base64Audio = await blobToBase64(blob);
                
                logEvent('Base64 encoding completed', { 
                    blobSize: blob.size, 
                    base64Length: base64Audio.length,
                    durationSeconds 
                });

                if (!sessionId) {
                    throw new Error('セッションIDが設定されていません');
                }

                // Whisper API呼び出し
                const result = await api.transcribeWithWhisper(
                    base64Audio,
                    sessionId,
                    durationSeconds
                );

                setTranscript(result.transcript);
                onTranscriptChange(result.transcript);
                
                if (result.remaining_minutes !== undefined) {
                    setWhisperRemainingMinutes(result.remaining_minutes);
                }

                setStatusMsg('文字起こし完了');
                logEvent('Whisper transcription successful', { 
                    transcriptLength: result.transcript.length,
                    remainingMinutes: result.remaining_minutes 
                });
            } catch (error: any) {
                logEvent('Whisper transcription failed', { error: String(error), errorType: error?.name });
                
                // エラーメッセージをチェック
                const errorMessage = error.message || String(error);
                if (errorMessage.includes('20分') || errorMessage.includes('上限') || errorMessage.includes('制限')) {
                    // Whisper制限に達した場合、端末STTに自動切り替え
                    setUseWhisper(false);
                    setStatusMsg('Whisper制限に達しました。端末STTモードに切り替えました');
                    setWhisperRemainingMinutes(0);
                } else if (errorMessage.includes('ネットワーク') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
                    // ネットワークエラーの場合
                    setStatusMsg('ネットワークエラーが発生しました。端末STTモードに切り替えます');
                    setUseWhisper(false);
                } else {
                    setStatusMsg(`文字起こしエラー: ${errorMessage}`);
                    // エラーが続く場合は端末STTにフォールバック
                    setUseWhisper(false);
                }
            } finally {
                setIsTranscribing(false);
                audioChunksRef.current = [];
                mediaRecorderRef.current = null;
            }
        };
        
        // MediaRecorderのonstopイベントを待つ
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
                setTimeout(processRecording, 100);
            };
        } else {
            // MediaRecorderが既に停止している場合
            setTimeout(processRecording, 100);
        }
    };

    // 端末STTモードでの録音開始（既存のWeb Speech API）
    const startRecordingWithDeviceSTT = async () => {
        if (isStartingRef.current) return;
        if (!supportsGetUserMedia()) {
            setStatusMsg('このブラウザは録音に未対応です（getUserMedia不可）');
            return;
        }
        if (!supportsSpeechRecognition()) {
            setStatusMsg('音声認識が未対応です。下のテキスト入力をご利用ください。');
            return;
        }

        // 事前に「ブロック」状態を検知できる環境では早めに案内する
        const permState = await getMicrophonePermissionState();
        if (permState === 'denied') {
            setStatusMsg('マイク権限が「ブロック」されています（Chromeのサイト設定でマイクを許可→再読み込み）');
            logEvent('permission precheck denied');
            return;
        }

        if (isDev) console.log('Starting recording sequence (Device STT)...');
        logEvent('startRecording clicked (Device STT)', { permState });

        stopAudioMonitoring();

        const rec = ensureRecognition();
        if (rec) {
            setTranscript('');
            setInterimTranscript('');
            setDuration(0);
            setIsRecording(true);
            isRecordingRef.current = true;
            isStartingRef.current = true;
            setStatusMsg('端末STTモードで起動中...');

            try {
                if (isDev) console.log('Calling recognitionRef.current.start()');
                rec.start();
            } catch (e) {
                const name = getDomExceptionName(e);
                if (isDev) console.error('Initial start error:', e);
                logEvent('SpeechRecognition start() threw', { name, err: String(e) });
                isStartingRef.current = false;
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    setStatusMsg('音声認識が拒否されました（Chromeのサイト設定/OSのマイク権限をご確認ください）');
                } else {
                    setStatusMsg('音声認識の起動に失敗しました');
                }
                isRecordingRef.current = false;
                setIsRecording(false);
                return;
            }

            setTimeout(() => {
                if (!isRecordingRef.current) return;
                if (isStartingRef.current) {
                    logEvent('SpeechRecognition start timeout');
                    isStartingRef.current = false;
                    isRecordingRef.current = false;
                    setIsRecording(false);
                    setStatusMsg('音声認識が開始しませんでした。下のテキスト入力をご利用ください。');
                }
            }, 5000);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } else {
            setStatusMsg('音声認識が未対応です。下のテキスト入力をご利用ください。');
            logEvent('SpeechRecognition ctor missing');
        }
    };

    // 録音開始（Whisper/端末STTを自動選択）
    const startRecording = async () => {
        // MediaRecorderがサポートされていない場合やsessionIdがない場合は端末STTを使用
        if (useWhisper && sessionId && supportsMediaRecorder()) {
            await startRecordingWithWhisper();
        } else {
            if (useWhisper && !supportsMediaRecorder()) {
                logEvent('MediaRecorder not supported, using device STT');
                setUseWhisper(false);
            }
            await startRecordingWithDeviceSTT();
        }
    };

    // Keep duration in sync with parent using an effect instead of inside setInterval
    useEffect(() => {
        if (duration > 0) {
            onDurationChange(duration);
        }
    }, [duration, onDurationChange]);

    const stopRecording = () => {
        if (isDev) console.log('Stopping recording sequence...');
        
        if (useWhisper && mediaRecorderRef.current) {
            // Whisperモードの場合
            stopRecordingWithWhisper();
        } else {
            // 端末STTモードの場合
            isRecordingRef.current = false;
            setIsRecording(false);
            stopAudioMonitoring();

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setInterimTranscript('');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-900">
            {/* Control Header */}
            <div className="space-y-4 border-b pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-700">認識言語:</span>
                        <select
                            value={lang}
                            onChange={(e) => setLang(e.target.value)}
                            disabled={isRecording}
                            className="text-sm border rounded px-2 py-1 bg-gray-50 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="en-US">English (US)</option>
                            <option value="ja-JP">Japanese (日本語)</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500">ステータス:</span>
                        <span className={`font-bold ${isRecording ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {statusMsg}
                        </span>
                    </div>
                </div>

                {/* Whisper使用状態表示 */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-600">音声認識モード:</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                            useWhisper 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                            {useWhisper ? 'Whisper高精度モード' : '端末STTモード'}
                        </span>
                    </div>
                    {useWhisper && whisperRemainingMinutes !== null && (
                        <div className="text-xs text-gray-600">
                            <span className="font-semibold">Whisper残り: </span>
                            <span className={`font-bold ${
                                whisperRemainingMinutes <= 5 ? 'text-red-600' : 'text-indigo-600'
                            }`}>
                                {whisperRemainingMinutes.toFixed(1)}分 / 20分
                            </span>
                        </div>
                    )}
                    {!useWhisper && whisperRemainingMinutes === 0 && (
                        <div className="text-xs text-amber-600 font-semibold">
                            Whisper制限に達しました
                        </div>
                    )}
                </div>

                {debugEnabled && (
                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    logEvent('re-request mic clicked');
                                    const ok = await startAudioMonitoring(true);
                                    stopAudioMonitoring();
                                    logEvent('re-request mic finished', { ok });
                                }}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
                            >
                                マイク許可ポップアップを出す（デバッグ）
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const text = debugLogs.join('\n');
                                    try {
                                        await navigator.clipboard.writeText(text);
                                        logEvent('debug log copied');
                                    } catch (e) {
                                        logEvent('debug log copy failed', e);
                                    }
                                }}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
                            >
                                ログをコピー
                            </button>
                            <button
                                type="button"
                                onClick={() => setDebugLogs([])}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
                            >
                                ログをクリア
                            </button>
                        </div>
                        <pre className="text-[10px] leading-snug bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap">
{debugLogs.join('\n') || '(no logs)'}
                        </pre>
                        <p className="text-[10px] text-gray-500">
                            デバッグ表示: URLに <code>?debug=1</code> を付けて開いてください。
                        </p>
                    </div>
                )}

                <div className="flex flex-col space-y-1">
                    <span className="text-xs font-semibold text-gray-500">使用するマイク:</span>
                    <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                            setSelectedDeviceId(e.target.value);
                            if (!isRecording) startAudioMonitoring(true);
                        }}
                        disabled={isRecording}
                        className="text-xs border rounded px-2 py-2 bg-gray-50 focus:ring-2 focus:ring-indigo-500 w-full truncate"
                    >
                        {devices.length === 0 && <option value="">マイクを検出中...</option>}
                        {devices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400">※反応がない場合は、別のマイクを選択してみてください</p>
                </div>
            </div>

            {/* Main Recorder Controls */}
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
                {!isRecording && !isTranscribing ? (
                    <button
                        onClick={startRecording}
                        disabled={isTranscribing}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold px-10 py-5 rounded-full text-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center space-x-3"
                    >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        <span>録音開始 / Speak Now</span>
                    </button>
                ) : isTranscribing ? (
                    <button
                        disabled
                        className="bg-indigo-500 text-white font-semibold px-10 py-5 rounded-full text-xl transition-all shadow-lg flex items-center space-x-3"
                    >
                        <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>文字起こし中...</span>
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-10 py-5 rounded-full text-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center space-x-3"
                    >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        <span>録音停止 / Finalize</span>
                    </button>
                )}

                {/* Live Feedback Area */}
                <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audio Input Monitor</span>
                        {isRecording && <span className="font-mono text-indigo-600 font-bold">{formatTime(duration)}</span>}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                        <div
                            className={`h-full transition-all duration-75 ${audioLevel > 5 ? 'bg-indigo-500' : 'bg-gray-300'}`}
                            style={{ width: `${Math.min(100, audioLevel)}%` }}
                        ></div>
                    </div>
                    {audioLevel <= 1 && isRecording && (
                        <p className="text-[10px] text-center text-red-500 font-bold animate-pulse">
                            ⚠️ 音を検知できていません。マイク設定を見直してください
                        </p>
                    )}
                </div>
            </div>

            {/* Error/Warning Banner */}
            {micWarning && isRecording && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-center animate-fade-in shadow-sm">
                    <svg className="w-5 h-5 mr-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p>
                        <strong>音量が小さいようです:</strong> もう少し大きな声で話すか、マイクに近づいてみてください。
                    </p>
                </div>
            )}

            {/* Transcription Box */}
            {(transcript || interimTranscript) && (
                <div className="bg-gray-50 rounded-xl p-5 min-h-[120px] border-2 border-indigo-50 shadow-inner relative">
                    <div className="absolute top-2 right-2">
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                    </div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Live Transcription:</p>
                    <div className="text-lg text-gray-800 leading-relaxed">
                        <span className="opacity-90">{transcript}</span>
                        <span className="text-indigo-600 font-bold border-b-2 border-indigo-200 animate-pulse">{interimTranscript}</span>
                    </div>
                </div>
            )}

            {/* Manual input fallback */}
            <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-600 mb-2 font-semibold">音声認識がうまく動作しない場合は、こちらに直接入力してください:</p>
                <textarea
                    value={transcript}
                    onChange={(e) => {
                        setTranscript(e.target.value);
                        onTranscriptChange(e.target.value);
                    }}
                    placeholder="Type your response here..."
                    className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>
        </div>
    );
}
