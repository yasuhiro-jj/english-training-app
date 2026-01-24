'use client';

import Link from 'next/link';
import { useAuth } from './lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-[#0a0c10] text-white overflow-hidden selection:bg-indigo-500/30">
      {/* Hero Background with Overlay */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] scale-110 motion-safe:animate-slow-zoom"
          style={{ backgroundImage: 'url("/hero-bg.png")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c10]/60 via-[#0a0c10]/40 to-[#0a0c10]" />

        {/* Animated Orbs for richness */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-24 pb-16 flex flex-col items-center">
        {/* Badge */}
        <div className="mb-6 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md text-indigo-300 text-sm font-medium animate-fade-in-down">
          ✨ Powered by Daily News & AI
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-blue-200 text-center mb-6 tracking-tight animate-fade-in">
          日常を、<br className="md:hidden" />「生きた英語」に変える
        </h1>

        <p className="max-w-2xl text-center text-lg md:text-xl text-indigo-100/80 mb-12 leading-relaxed animate-fade-in delay-200">
          AIが選ぶ「今日の一記事」から、リアルな語彙と議論を。
          <br className="hidden md:block" />
          途切れない会話、心に刺さるフィードバックを体験してください。
        </p>

        {/* Action Button */}
        <div className="mb-20 animate-fade-in delay-300">
          <Link
            href={loading ? "#" : "/login"}
            aria-disabled={loading}
            className="group relative inline-flex items-center justify-center px-12 py-5 font-bold text-white transition-all duration-300 bg-indigo-600 rounded-full hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_35px_rgba(79,70,229,0.6)] active:scale-95"
            onClick={(e) => {
              if (loading) e.preventDefault();
            }}
          >
            <span>{loading ? "準備中..." : "トレーニングを始める"}</span>
            <svg
              className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Steps / Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl animate-fade-in-up delay-500">
          {[
            { step: "01", title: "記事を選ぶ", desc: "レベルに合わせた最新ニュースをAIがピックアップ" },
            { step: "02", title: "単語を学ぶ", desc: "IPA発音記号付きの語彙解説で、正確な基礎を" },
            { step: "03", title: "自由に話す", desc: "最新の音声認識エンジンで、途切れない議論体験" },
            { step: "04", title: "振り返る", desc: "文法からニュアンスまで。Notionへ自動保存" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors duration-300 group"
            >
              <div className="text-3xl font-black text-indigo-500/50 mb-4 group-hover:text-indigo-400/80 transition-colors">
                {item.step}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">
                {item.title}
              </h3>
              <p className="text-sm text-indigo-100/60 leading-relaxed font-medium">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-20 text-indigo-100/40 text-sm flex items-center space-x-6 animate-fade-in delay-700">
          <span>Daily News Edition</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span>v1.2.0</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slow-zoom {
          from { transform: scale(1.0); }
          to { transform: scale(1.1); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s infinite alternate ease-in-out;
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: opacity 1s ease-out forwards;
        }
        @keyframes opacity {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-700 { animation-delay: 700ms; }
      `}</style>
    </div>
  );
}
