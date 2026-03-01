'use client';

import { useState, useRef, useEffect } from 'react';
import { convertJapaneseNamesInText } from '../lib/japaneseToRomaji';
import { api } from '@/lib/api';

export default function AIChat() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const isVoiceModeRef = useRef(false);
    const messagesRef = useRef<{ role: 'user' | 'assistant', content: string }[]>([]);
    
    // MediaRecorder関連のref
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingStartTimeRef = useRef<number>(0);
    const sessionIdRef = useRef<string>('');

    // Sync state to refs to avoid stale closures
    useEffect(() => {
        isVoiceModeRef.current = isVoiceMode;
    }, [isVoiceMode]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // セッションIDを生成（Whisper API用）
    useEffect(() => {
        sessionIdRef.current = `chat-${Date.now()}`;
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // クリーンアップ処理（コンポーネントアンマウント時のみ）
    useEffect(() => {
        return () => {
            console.log('[AIChat] Component unmounting, cleaning up...');
            // 録音中の場合は停止
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                console.log('[AIChat] Stopping MediaRecorder on unmount');
                mediaRecorderRef.current.stop();
            }
            // ストリームを解放
            if (streamRef.current) {
                console.log('[AIChat] Stopping stream tracks on unmount');
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // 依存配列を空にして、アンマウント時のみ実行するようにする

    // コンポーネントマウント時の確認
    useEffect(() => {
        console.log('[AIChat] Component mounted');
        // MediaRecorder APIのサポート確認
        if (typeof window !== 'undefined') {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('[AIChat] getUserMedia not supported');
                setStatusMsg('このブラウザは音声録音をサポートしていません');
            } else if (!window.MediaRecorder) {
                console.warn('[AIChat] MediaRecorder not supported');
                setStatusMsg('MediaRecorder APIがサポートされていません');
            } else {
                console.log('[AIChat] MediaRecorder API supported');
                // サポートされているMIMEタイプを確認
                const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
                const availableTypes = supportedTypes.filter(type => MediaRecorder.isTypeSupported(type));
                console.log('[AIChat] Supported MIME types:', availableTypes);
            }
        }
    }, []);

    // Audio player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Play audio response using OpenAI TTS
    const playAudioResponse = async (text: string) => {
        // ロード中は操作を無視（連打防止）
        if (isAudioLoading) return;

        try {
            // 既存の再生を停止
            stopAudio();
            
            setIsAudioLoading(true); // ロード開始

            console.log('[AIChat] Requesting TTS for:', text.substring(0, 50) + '...');
            
            // Call backend TTS API
            const audioBuffer = await api.ttsSpeak(text);
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            
            const audio = new Audio(url);
            audioRef.current = audio;
            
            audio.onplay = () => {
                setIsPlaying(true);
                setIsAudioLoading(false); // 再生開始したらロード解除
            };
            audio.onended = () => {
                setIsPlaying(false);
                URL.revokeObjectURL(url);
            };
            audio.onpause = () => setIsPlaying(false);
            audio.onerror = (e) => {
                console.error('[AIChat] Audio playback error:', e);
                setIsPlaying(false);
                setIsAudioLoading(false);
                setStatusMsg('Audio playback failed');
            };
            
            await audio.play();
        } catch (error) {
            console.error('[AIChat] TTS error:', error);
            setStatusMsg('Failed to play audio');
            setIsAudioLoading(false);
        }
    };

    // Stop audio playback
    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0; // Reset to beginning
            setIsPlaying(false);
        }
    };

    // Toggle play/pause
    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
        }
    };

    // 音声録音を開始
    const startRecording = async () => {
        try {
            console.log('[AIChat] Starting recording...');
            
            // MediaRecorder APIのサポート確認
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('このブラウザは音声録音をサポートしていません');
            }

            if (!window.MediaRecorder) {
                throw new Error('MediaRecorder APIがサポートされていません');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            console.log('[AIChat] Microphone access granted');
            
            // MediaRecorderの設定
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
                ? 'audio/webm' 
                : MediaRecorder.isTypeSupported('audio/mp4')
                ? 'audio/mp4'
                : '';
            
            if (!mimeType) {
                throw new Error('音声録音形式がサポートされていません');
            }

            console.log('[AIChat] Using mimeType:', mimeType);
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            // 録音開始時刻を記録（MediaRecorderのstart()が呼ばれた時点）
            recordingStartTimeRef.current = Date.now();
            console.log('[AIChat] Recording start time set:', recordingStartTimeRef.current);

            mediaRecorder.ondataavailable = (event) => {
                console.log('[AIChat] ondataavailable event fired, data size:', event.data?.size || 0);
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log('[AIChat] Audio chunk received:', event.data.size, 'bytes, total chunks:', audioChunksRef.current.length);
                } else {
                    console.warn('[AIChat] Empty or null data chunk received');
                }
            };

            mediaRecorder.onstop = async () => {
                const stopTime = Date.now();
                const actualDuration = (stopTime - recordingStartTimeRef.current) / 1000;
                
                console.log('[AIChat] MediaRecorder onstop event fired');
                console.log('[AIChat] Recording duration:', actualDuration.toFixed(2), 'seconds');
                console.log('[AIChat] Audio chunks count:', audioChunksRef.current.length);
                
                // データチャンクの合計サイズを確認
                const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
                console.log('[AIChat] Total audio data size:', totalSize, 'bytes');
                
                // ストリームを停止（onstopイベント後に確実に停止）
                if (streamRef.current) {
                    console.log('[AIChat] Stopping media stream tracks after recording stopped...');
                    streamRef.current.getTracks().forEach(track => {
                        track.stop();
                        console.log('[AIChat] Track stopped:', track.kind);
                    });
                    streamRef.current = null;
                }
                
                // 録音データをコピーして保持（processRecording内でクリアされる前に）
                const chunksCopy = [...audioChunksRef.current];
                console.log('[AIChat] Chunks copied for processing, count:', chunksCopy.length);
                
                // 録音停止時にWhisper APIに送信（実際の録音時間を渡す）
                await processRecording(chunksCopy, actualDuration);
            };

            mediaRecorder.onerror = (event: any) => {
                console.error('[AIChat] MediaRecorder error:', event);
                console.error('[AIChat] Error details:', {
                    error: event.error,
                    name: event.error?.name,
                    message: event.error?.message
                });
                setStatusMsg('録音エラーが発生しました: ' + (event.error?.message || 'Unknown error'));
                setIsListening(false);
            };

            // timesliceを指定して定期的にデータを取得（100msごと）
            // これにより、録音中でもデータが確実に取得される
            mediaRecorder.start(100);
            setIsListening(true);
            setStatusMsg('🎤 Recording... Click microphone to stop');
            console.log('[AIChat] Recording started successfully, state:', mediaRecorder.state);
            
            // 録音開始直後にデータをリクエスト（データが確実に取得されるように）
            setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    console.log('[AIChat] Requesting initial data chunk...');
                    try {
                        mediaRecorderRef.current.requestData();
                    } catch (error: any) {
                        console.warn('[AIChat] Error requesting initial data:', error);
                    }
                }
            }, 200);
        } catch (error: any) {
            console.error('[AIChat] Recording start error:', error);
            const errorMsg = error.message || 'マイクへのアクセスが拒否されました';
            setStatusMsg(errorMsg);
            setIsListening(false);
        }
    };

    // 音声録音を停止
    const stopRecording = () => {
        console.log('[AIChat] stopRecording called, isListening:', isListening, 'mediaRecorder state:', mediaRecorderRef.current?.state);
        
        if (mediaRecorderRef.current) {
            // MediaRecorderの状態を確認（recording状態の時のみ停止）
            const recorderState = mediaRecorderRef.current.state;
            console.log('[AIChat] MediaRecorder state:', recorderState);
            
            if (recorderState === 'recording' || recorderState === 'paused') {
                console.log('[AIChat] Requesting final data chunk before stopping...');
                try {
                    // 最後のデータチャンクを確実に取得するためにrequestData()を呼ぶ
                    mediaRecorderRef.current.requestData();
                    
                    // 少し待ってからstop()を呼ぶ（最後のチャンクが確実に取得されるように）
                    setTimeout(() => {
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                            console.log('[AIChat] Stopping MediaRecorder...');
                            mediaRecorderRef.current.stop();
                            console.log('[AIChat] MediaRecorder.stop() called successfully');
                        }
                    }, 100);
                } catch (error: any) {
                    console.error('[AIChat] Error requesting data or stopping MediaRecorder:', error);
                    // エラーが発生してもstop()を試みる
                    try {
                        if (mediaRecorderRef.current) {
                            mediaRecorderRef.current.stop();
                        }
                    } catch (stopError: any) {
                        console.error('[AIChat] Error stopping MediaRecorder:', stopError);
                        setStatusMsg('Error stopping recording');
                    }
                }
            } else {
                console.log('[AIChat] MediaRecorder is not in recording state, state:', recorderState);
                setStatusMsg('No active recording');
            }
        } else {
            console.warn('[AIChat] MediaRecorder ref is null');
            setStatusMsg('No active recording');
        }
        
        // 状態を更新（UIの応答性を向上）
        setIsListening(false);
        setStatusMsg('Stopping recording...');
        
        // ストリームはonstopイベント後に停止する（確実にデータを取得するため）
        // ただし、MediaRecorderが存在しない場合は即座に停止
        if (!mediaRecorderRef.current && streamRef.current) {
            console.log('[AIChat] Stopping media stream tracks immediately (no MediaRecorder)...');
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('[AIChat] Track stopped:', track.kind);
            });
            streamRef.current = null;
        }
    };

    // 録音データをWhisper APIに送信
    const processRecording = async (chunks?: Blob[], actualDuration?: number) => {
        // 引数でチャンクが渡されていない場合は、refから取得
        const audioChunks = chunks || audioChunksRef.current;
        
        if (audioChunks.length === 0) {
            console.warn('[AIChat] No audio chunks recorded');
            setStatusMsg('No audio recorded');
            setIsTranscribing(false);
            return;
        }

        setIsTranscribing(true);
        console.log('[AIChat] Processing recording, chunks:', audioChunks.length);
        
        try {
            // 音声データをBlobに結合
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            // 実際の録音時間を使用（引数で渡されていない場合は計算）
            const durationSeconds = actualDuration !== undefined 
                ? actualDuration 
                : (Date.now() - recordingStartTimeRef.current) / 1000;
            console.log('[AIChat] Audio blob size:', audioBlob.size, 'bytes, duration:', durationSeconds.toFixed(2), 's');
            
            // 空のBlobの場合はエラー
            if (audioBlob.size === 0) {
                throw new Error('Recorded audio is empty');
            }
            
            // 最小録音時間のチェック（0.5秒以上）
            if (durationSeconds < 0.5) {
                throw new Error(`録音時間が短すぎます（${durationSeconds.toFixed(2)}秒）。0.5秒以上話してください。`);
            }
            
            // 最小データサイズのチェック（1KB以上）
            if (audioBlob.size < 1024) {
                throw new Error(`録音データが小さすぎます（${audioBlob.size}バイト）。もう少し長く話してください。`);
            }

            // base64エンコード
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    if (!reader.result) {
                        throw new Error('FileReader result is null');
                    }

                    const resultString = reader.result as string;
                    const base64Audio = resultString.split(',')[1];
                    
                    if (!base64Audio) {
                        throw new Error('Failed to extract base64 audio data');
                    }

                    console.log('[AIChat] Sending to Whisper API, base64 length:', base64Audio.length);
                    console.log('[AIChat] Request payload:', {
                        sessionId: sessionIdRef.current,
                        durationSeconds: durationSeconds,
                        audioDataLength: base64Audio.length
                    });
                    
                    // Whisper APIに送信
                    const result = await api.transcribeWithWhisper(
                        base64Audio,
                        sessionIdRef.current,
                        durationSeconds
                    );

                    console.log('[AIChat] Whisper API response received:', result);

                    const transcript = result.transcript.trim();
                    if (transcript) {
                        console.log('[AIChat] Transcript:', transcript);
                        // setInput(transcript); // 送信するので入力欄には設定しない（または送信後にクリアされる）
                        
                        // 文字起こし完了後、すぐにトランスクライブ状態を解除（AI思考中状態へ移行）
                        setIsTranscribing(false);
                        
                        // 自動的に送信（awaitしないことでUIをブロックしない）
                        handleSend(transcript).catch(err => {
                            console.error('[AIChat] Error in handleSend:', err);
                            setMessages(prev => [...prev, { role: 'assistant', content: '申し訳ありません。エラーが発生しました。' }]);
                        });
                    } else {
                        console.warn('[AIChat] No transcript received');
                        setStatusMsg('No speech detected');
                        setIsTranscribing(false);
                    }

                    if (result.remaining_minutes !== undefined && result.remaining_minutes !== null) {
                        setStatusMsg(`Whisper remaining: ${result.remaining_minutes.toFixed(1)} min`);
                    } else {
                        setStatusMsg('');
                    }
                } catch (error: any) {
                    console.error('[AIChat] Whisper transcription error:', error);
                    console.error('[AIChat] Error details:', {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    });
                    const errorMsg = error.message || 'Transcription failed';
                    setStatusMsg(errorMsg);
                    setIsTranscribing(false);
                } finally {
                    // setIsTranscribing(false); // 上で個別に制御するため削除
                    audioChunksRef.current = [];
                }
            };

            reader.onerror = () => {
                console.error('[AIChat] FileReader error');
                setStatusMsg('Error reading audio file');
                setIsTranscribing(false);
            };

            reader.readAsDataURL(audioBlob);
        } catch (error: any) {
            console.error('[AIChat] Processing error:', error);
            setStatusMsg(error.message || 'Error processing audio');
            setIsTranscribing(false);
        }
    };

    const toggleListening = () => {
        console.log('[AIChat] toggleListening called, isListening:', isListening);
        
        if (isListening) {
            console.log('[AIChat] Stopping recording...');
            stopRecording();
        } else {
            console.log('[AIChat] Starting recording...');
            startRecording();
        }
    };

    const handleSend = async (manualInput?: string) => {
        const messageToSend = manualInput || input;
        if (!messageToSend.trim() || isTyping) return;

        const userMsg = messageToSend.trim();
        // 入力欄をクリア（手動入力でも音声入力でも）
        setInput('');

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);
        setStatusMsg('');

        try {
            // Use REF for history to avoid stale closure
            const history = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
            const data = await api.sendMessage(userMsg, history);
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

            // Ensure TTS playback if voice mode is on (Checking both state and ref for safety)
            if (isVoiceMode || isVoiceModeRef.current) {
                console.log('Triggering TTS for response (Handled by handleSend)...');
                playAudioResponse(data.response);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: '申し訳ありません。エラーが発生しました。' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-[550px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all hover:border-white/20">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span className="font-bold text-sm tracking-tight text-slate-100">AI Tutor Mode</span>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => {
                            const newMode = !isVoiceMode;
                            setIsVoiceMode(newMode);
                            if (newMode) {
                                setStatusMsg('Voice playback enabled (OpenAI TTS)');
                            } else {
                                stopAudio(); // Turn off audio immediately
                                setStatusMsg('Voice playback disabled');
                            }
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${isVoiceMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/10 text-slate-400'
                            }`}
                    >
                        {isVoiceMode ? '🔊 VOICE ON' : '🔈 VOICE OFF'}
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-slate-900/20"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 px-8">
                        <div className="text-4xl animate-bounce">🎓</div>
                        <p className="text-sm font-medium leading-relaxed">
                            Welcome! I'm your AI English Tutor.<br />
                            Let's have a conversation. You can type or use the microphone (Whisper API).
                        </p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg group relative ${m.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white/10 text-slate-200 border border-white/10 rounded-tl-none'
                                }`}
                        >
                            {m.content}
                            {m.role === 'assistant' && (
                                <div className="absolute -right-12 top-2 flex flex-col gap-2">
                                    <button
                                        onClick={() => playAudioResponse(m.content)}
                                        disabled={isAudioLoading}
                                        className={`p-2 rounded-full transition-all shadow-md ${
                                            isAudioLoading 
                                            ? 'bg-gray-500/20 text-gray-400 cursor-wait' 
                                            : 'bg-white/5 hover:bg-white/20 text-indigo-400'
                                        }`}
                                        title="Play audio"
                                    >
                                        {isAudioLoading ? '⏳' : '🔊'}
                                    </button>
                                    {isPlaying && (
                                        <button
                                            onClick={stopAudio}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-all text-red-400 shadow-md"
                                            title="Stop audio"
                                        >
                                            ⏹️
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none border border-white/10">
                            <div className="flex space-x-1.5 Items-center">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Indicator */}
            {statusMsg && (
                <div className="px-4 py-1 text-[10px] bg-indigo-500/20 text-indigo-300 font-bold border-t border-white/5">
                    {statusMsg}
                </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white/5 border-t border-white/10">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[AIChat] Button clicked, isListening:', isListening, 'isTranscribing:', isTranscribing);
                            toggleListening();
                        }}
                        disabled={isTranscribing}
                        className={`p-3 rounded-2xl transition-all active:scale-95 shadow-lg ${
                            isListening
                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/20 cursor-pointer'
                                : isTranscribing
                                ? 'bg-yellow-500 text-white cursor-not-allowed'
                                : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 cursor-pointer'
                        }`}
                        title={isTranscribing ? 'Transcribing...' : isListening ? 'Stop Recording (Click to stop)' : 'Start Recording (Click to start)'}
                    >
                        {isTranscribing ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                            </svg>
                        )}
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isListening ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Type or speak English...'}
                            className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-500"
                        />
                    </div>

                    <button
                        onClick={() => handleSend()}
                        disabled={isTyping || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white p-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
