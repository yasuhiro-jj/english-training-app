'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
    onTranscriptChange: (transcript: string) => void;
    onDurationChange: (duration: number) => void;
}

export default function AudioRecorder({ onTranscriptChange, onDurationChange }: AudioRecorderProps) {
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

    const recognitionRef = useRef<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isRecordingRef = useRef(false);
    const isStartingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const isDev = process.env.NODE_ENV === 'development';

    const getSpeechRecognitionCtor = () => {
        if (typeof window === 'undefined') return null;
        return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
    };

    const supportsSpeechRecognition = () => !!getSpeechRecognitionCtor();

    const supportsGetUserMedia = () =>
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';

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

    useEffect(() => {
        // Web Speech API の初期化
        const SpeechRecognition = getSpeechRecognitionCtor();

        if (typeof window !== 'undefined' && SpeechRecognition) {
            if (isDev) console.log('Initializing SpeechRecognition engine for lang:', lang);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = lang;

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscriptChunk = '';
                let currentInterim = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscriptChunk += transcript + ' ';
                    } else {
                        currentInterim += transcript;
                    }
                }

                setInterimTranscript(currentInterim);
                if (currentInterim || finalTranscriptChunk) {
                    setMicWarning(false);
                    setStatusMsg('音声を収集中...');
                }

                if (finalTranscriptChunk) {
                    if (isDev) console.log('Final transcript chunk detected:', finalTranscriptChunk);
                    setTranscript((prev) => {
                        const newTranscript = prev + finalTranscriptChunk;
                        setTimeout(() => onTranscriptChangeRef.current(newTranscript), 0);
                        return newTranscript;
                    });
                }
            };

            recognitionRef.current.onstart = () => {
                if (isDev) console.log('Speech recognition engine ONSTART');
                setStatusMsg('聞き取り中...');
                isStartingRef.current = false;
            };

            recognitionRef.current.onerror = (event: any) => {
                if (isDev) console.error('Speech recognition error event:', event.error);
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

            recognitionRef.current.onend = () => {
                if (isDev) console.log('Speech recognition engine ONEND');
                if (isRecordingRef.current) {
                    // Persistent restart logic (300ms delay for stability)
                    setTimeout(() => {
                        try {
                            if (isRecordingRef.current) {
                                recognitionRef.current.start();
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
        }

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
                return false;
            }

            if (isDev) console.log('Requesting microphone access with deviceId:', selectedDeviceId);
            const constraints = {
                // exact は端末によって失敗しやすいので ideal にする
                audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (isDev) console.log('Microphone access granted. Stream:', stream.id, 'Active:', stream.active);
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

    const startRecording = async () => {
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
            return;
        }

        if (isDev) console.log('Starting recording sequence...');

        // NOTE:
        // Android/Chromeでは getUserMedia（マイク取得）と SpeechRecognition が同時にマイクを取り合い、
        // SpeechRecognition が無反応になることがある。
        // まずは SpeechRecognition 単体で開始し、音量モニタ(getUserMedia)は録音中は使わない。
        stopAudioMonitoring();

        if (!recognitionRef.current) {
            if (isDev) console.warn('Recognition service not initialized');
            const SpeechRecognition = getSpeechRecognitionCtor();
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = lang;
                // Need to re-attach handlers here if we want it to work instantly, 
                // but ideally it should be initialized in useEffect.
            }
        }

        if (recognitionRef.current) {
            setTranscript('');
            setInterimTranscript('');
            setDuration(0);
            setIsRecording(true);
            isRecordingRef.current = true;
            isStartingRef.current = true;
            setStatusMsg('起動中...');

            try {
                if (isDev) console.log('Calling recognitionRef.current.start()');
                recognitionRef.current.start();
            } catch (e) {
                const name = getDomExceptionName(e);
                if (isDev) console.error('Initial start error:', e);
                isStartingRef.current = false;
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    setStatusMsg('音声認識が拒否されました（Chromeのサイト設定/OSのマイク権限をご確認ください）');
                } else {
                    setStatusMsg('音声認識の起動に失敗しました');
                }
                // 失敗時は固まらないように後片付け
                isRecordingRef.current = false;
                setIsRecording(false);
            }

            // タイマー開始
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
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
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-10 py-5 rounded-full text-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center space-x-3"
                    >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        <span>録音開始 / Speak Now</span>
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
