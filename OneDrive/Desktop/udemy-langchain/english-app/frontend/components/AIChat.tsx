'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AIChat() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const isVoiceModeRef = useRef(false);
    const transcriptBufferRef = useRef('');
    const messagesRef = useRef<{ role: 'user' | 'assistant', content: string }[]>([]);
    const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync state to refs to avoid stale closures in recognition handlers
    useEffect(() => {
        isVoiceModeRef.current = isVoiceMode;
    }, [isVoiceMode]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscriptChunk = '';
                let interimTranscript = '';

                // CRITICAL: Reset the timeout on ANY activity (interim or final)
                // This prevents cutting off while the user is still speaking.
                if (sendTimeoutRef.current) {
                    clearTimeout(sendTimeoutRef.current);
                    sendTimeoutRef.current = null;
                }

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscriptChunk += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscriptChunk) {
                    transcriptBufferRef.current += finalTranscriptChunk;
                }

                // Set a new timeout to wait for a natural pause (4.3 seconds)
                // Adjusted from 5.0s to 4.3s per user request.
                if (isListeningRef.current) {
                    sendTimeoutRef.current = setTimeout(() => {
                        const totalText = (transcriptBufferRef.current + interimTranscript).trim();
                        if (totalText) {
                            console.log('Sending accumulated transcript after silence:', totalText);
                            handleSend(totalText);
                            transcriptBufferRef.current = '';
                            setInput('');
                        }
                    }, 4300);
                }

                // Show current accumulation + interim in the UI
                const displayInput = transcriptBufferRef.current + interimTranscript;
                if (displayInput) {
                    setInput(displayInput);
                }
            };

            recognitionRef.current.onend = () => {
                if (isListeningRef.current) {
                    setTimeout(() => {
                        try {
                            if (isListeningRef.current) recognitionRef.current.start();
                        } catch (e) {
                            console.error('Restart failed:', e);
                        }
                    }, 300);
                } else {
                    setIsListening(false);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('STT Error:', event.error);
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    return;
                }
                setStatusMsg('Recognition error: ' + event.error);
            };
        }

        return () => {
            if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Text-to-Speech Helper with robust voice loading
    const speak = (text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.error('Speech synthesis not supported');
            return;
        }

        console.log('Speech requested for:', text.substring(0, 50) + '...');

        // Ensure synthesis is not in a weird state
        try {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        } catch (e) {
            console.error('Error resetting speech synthesis:', e);
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;

        utterance.onstart = () => console.log('TTS started speaking successfully');
        utterance.onerror = (e) => console.error('TTS utterance error:', e);
        utterance.onend = () => console.log('TTS finished speaking');

        const voices = window.speechSynthesis.getVoices();

        const doSpeak = (availableVoices: SpeechSynthesisVoice[]) => {
            const englishVoice = availableVoices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                availableVoices.find(v => v.lang.startsWith('en-US')) ||
                availableVoices.find(v => v.lang.startsWith('en'));

            if (englishVoice) {
                console.log('Using voice:', englishVoice.name);
                utterance.voice = englishVoice;
            } else {
                console.warn('No specific English voice found, using default');
            }

            window.speechSynthesis.speak(utterance);
        };

        if (voices.length > 0) {
            doSpeak(voices);
        } else {
            console.log('Waiting for voices to load...');
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.onvoiceschanged = null;
                const updatedVoices = window.speechSynthesis.getVoices();
                doSpeak(updatedVoices);
            };
        }
    };

    const toggleListening = () => {
        if (isListening) {
            isListeningRef.current = false;
            recognitionRef.current?.stop();
            setIsListening(false);
            setStatusMsg('Microphone OFF');
            if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
        } else {
            isListeningRef.current = true;
            transcriptBufferRef.current = '';
            setInput('');
            recognitionRef.current?.start();
            setIsListening(true);
            setStatusMsg('Microphone ACTIVE - I am listening...');
        }
    };

    const handleSend = async (manualInput?: string) => {
        const messageToSend = manualInput || input;
        if (!messageToSend.trim() || isTyping) return;

        const userMsg = messageToSend.trim();
        if (!manualInput) {
            setInput('');
            transcriptBufferRef.current = '';
        }

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);
        setStatusMsg('');

        try {
            // Use REF for history to avoid stale closure if called from STT timeout
            const history = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
            const data = await api.sendMessage(userMsg, history);
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

            // Ensure TTS playback if voice mode is on (Checking both state and ref for safety)
            if (isVoiceMode || isVoiceModeRef.current) {
                console.log('Triggering TTS for response (Handled by handleSend)...');
                speak(data.response);
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
                            setIsVoiceMode(!isVoiceMode);
                            if (!isVoiceMode) setStatusMsg('Voice playback enabled');
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
                            Let's have a conversation. You can type or use the microphone.
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
                                <button
                                    onClick={() => speak(m.content)}
                                    className="absolute -right-10 top-2 p-2 bg-white/5 hover:bg-white/20 rounded-full transition-all text-indigo-400 shadow-md"
                                    title="Play audio"
                                >
                                    🔊
                                </button>
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
                        onClick={toggleListening}
                        className={`p-3 rounded-2xl transition-all active:scale-95 shadow-lg ${isListening
                            ? 'bg-red-500 text-white animate-pulse shadow-red-500/20'
                            : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/20'
                            }`}
                        title="Start Voice Recognition"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                        </svg>
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isListening ? 'Listening...' : 'Type or speak English...'}
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
