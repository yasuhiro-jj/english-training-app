"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Zap, Globe, BookOpen, MessageSquare, TrendingUp, CheckCircle2, Clock, BarChart3, Eye, Target, AlertCircle, RefreshCw, Sparkles, Crown, Users, Lightbulb, Award, Briefcase, Globe2, MessageCircle } from "lucide-react";
import Link from 'next/link';
import { useAuth } from './lib/auth-context';

// アニメーション用のコンポーネント
const FadeInUp = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, desc, delay }: { icon: any; title: string; desc: string; delay?: number }) => (
  <FadeInUp delay={delay}>
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  </FadeInUp>
);

const ProblemCard = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
    <div className="flex items-start space-x-4">
      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-red-600" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  </div>
);

const SolutionCard = ({ number, title, desc, features }: { number: string; title: string; desc: string; features: string[] }) => (
  <FadeInUp>
    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xl mr-4">
          {number}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 mb-6 leading-relaxed">{desc}</p>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start">
            <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  </FadeInUp>
);

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="w-full min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">DeepSpeak</span>
          </div>
          <div className="flex items-center space-x-2">
            {user ? (
              <Link
                href="/dashboard"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full transition-colors"
              >
                ダッシュボードへ
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900 text-sm font-semibold transition-colors"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full transition-colors"
                >
                  無料で始める
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <FadeInUp>
            <div className="inline-block px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold mb-3">
              中上級ビジネスマン向け
            </div>
          </FadeInUp>
          
          <FadeInUp delay={0.1}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-gray-900 mb-3 leading-tight px-2 max-w-5xl mx-auto">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                DeepSpeak
              </span>
            </h1>
          </FadeInUp>
          
          <FadeInUp delay={0.2}>
            <p className="text-xl text-gray-900 font-bold mb-3 leading-relaxed px-2 max-w-4xl mx-auto">
              世界で通用する<br />深い議論力を身につける
            </p>
            <p className="text-base text-indigo-600 font-semibold mb-6 px-2 max-w-3xl mx-auto">
              Business English for Professionals
            </p>
          </FadeInUp>

          <FadeInUp delay={0.3}>
            <div className="flex flex-col items-center justify-center gap-3 mb-6">
              <Link href={user ? "/dashboard" : "/signup"}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-full shadow-lg shadow-indigo-500/30 flex items-center space-x-2"
                >
                  <span>無料体験を始める</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/login">
                <button className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold text-base rounded-full border-2 border-gray-200 transition-colors">
                  ログイン
                </button>
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              ✓ クレジットカード登録不要 ✓ 7日間フル機能をお試し ✓ 体験終了後も自動課金なし
            </p>
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg max-w-2xl mx-auto">
              <p className="text-xs font-semibold text-indigo-900 mb-2">無料体験プランの1日の制限</p>
              <div className="text-xs text-indigo-700 space-y-1">
                <p>• レッスン: 1日1レッスンまで</p>
                <p>• AIコーチング: 1日10メッセージまで</p>
                <p>• Whisper音声認識: 20分/月まで</p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Target & Problem Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
                悩み
              </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              こんなお悩みありませんか？
            </h2>
            </div>
          </FadeInUp>
          
          <FadeInUp delay={0.2}>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <ProblemCard
                icon={Brain}
                title="文法・単語はできるが、日本語のように深い考えを英語で表現できない"
                desc="ビジネスの場面で、自分の意見や考えを英語で深く伝えられず、表面的な会話で終わってしまう..."
              />
              <ProblemCard
                icon={Globe}
                title="身の回りの話だけでなく、世界の課題について自分の意見をフルに伝えたい"
                desc="天気や趣味の話はできるが、国際的なビジネスシーンで求められる深い議論や意見交換ができない..."
              />
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* 3 Core Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-4">
                機能の3本柱
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                深いコミュニケーション力を<br />
                身につける3つのステップ
              </h2>
              <p className="text-xs sm:text-base md:text-lg text-gray-600 mt-4 mx-auto">
                読む（教養を深める）→ 話す（豊かな人間性を発信）→ 振り返る（深いコミュニケーション力を磨く）
              </p>
            </div>
          </FadeInUp>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <FadeInUp delay={0.2}>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 shadow-lg border-2 border-indigo-200 text-center">
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <div className="text-4xl font-bold text-indigo-600 mb-4">01</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  読む<br />
                  <span className="text-lg text-gray-600 font-normal">（教養を深める）</span>
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  世界の最新ニュースを題材に、ビジネスに必要な教養と知識を深めます。表面的な情報ではなく、深い理解を英語で獲得します。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.4}>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg border-2 border-purple-200 text-center">
                <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <div className="text-4xl font-bold text-purple-600 mb-4">02</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  話す<br />
                  <span className="text-lg text-gray-600 font-normal">（豊かな人間性を発信）</span>
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  自分の意見や考えを英語で表現し、AIとの対話で深い議論を実践します。あなたの人間性や価値観を英語で伝える力を養います。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.6}>
              <div className="bg-gradient-to-br from-pink-50 to-indigo-50 rounded-2xl p-8 shadow-lg border-2 border-pink-200 text-center">
                <div className="w-20 h-20 bg-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <RefreshCw className="w-10 h-10 text-white" />
                </div>
                <div className="text-4xl font-bold text-pink-600 mb-4">03</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  振り返る<br />
                  <span className="text-sm text-gray-600 font-normal">（深いコミュニケーション力を磨く）</span>
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  AIからの詳細なフィードバックで、自分の表現を改善し続けます。一時的な会話ではなく、継続的な成長で真のコミュニケーション力を獲得します。
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>


      {/* Comparison Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
                他社比較
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                表面的な英会話ではなく、<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  「世界人として活躍するための深いコミュニケーション力」を養う
                </span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-4 max-w-3xl mx-auto">
                議論力・論理構成・豊かな人間性の表現力を身につけ、真のあなたを伝える力を獲得します
              </p>
            </div>
          </FadeInUp>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <FadeInUp delay={0.2}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-indigo-200">
                <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">議論力</h3>
                <p className="text-gray-600 leading-relaxed">
                  単なる会話ではなく、異なる意見を交わし、深い議論を展開する力を身につけます。<br />ビジネスの場で求められる議論力を養います。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.4}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-200">
                <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">論理構成</h3>
                <p className="text-gray-600 leading-relaxed">
                  自分の意見を論理的に構成し、相手に分かりやすく伝える力を養います。<br />ビジネスシーンで必須の論理的思考力を英語で表現します。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.6}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-pink-200">
                <div className="w-16 h-16 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">豊かな人間性の表現力</h3>
                <p className="text-gray-600 leading-relaxed">
                  あなたの価値観や考えを英語で表現し、真のあなたを知ってもらう力を身につけます。<br />表面的な会話を超えた深いコミュニケーションを実現します。
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* 1 Lesson Flow Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
                1レッスンの流れ
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                一時的な会話ではなく、<br />
                あなたの考えを<br />フルに表現する訓練
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                表面的な英会話を超えて、深い議論と意見交換の力を身につけます
              </p>
            </div>
          </FadeInUp>

          <div className="grid md:grid-cols-5 gap-6 mt-12">
            <FadeInUp delay={0.1}>
              <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-2 border-indigo-200">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">レッスン生成</h3>
                <p className="text-sm text-gray-600">
                  世界の最新ニュースから、<br />AIが自動的に英語レッスンを生成
                </p>
              </div>
            </FadeInUp>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-indigo-400 hidden md:block" />
            </div>

            <FadeInUp delay={0.2}>
              <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-2 border-purple-200">
                <div className="w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">要約理解</h3>
                <p className="text-sm text-gray-600">
                  記事の内容を深く理解し、<br />重要なポイントを把握して教養を深める
                </p>
              </div>
            </FadeInUp>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-purple-400 hidden md:block" />
            </div>

            <FadeInUp delay={0.3}>
              <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-2 border-pink-200">
                <div className="w-14 h-14 bg-pink-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">立場表明</h3>
                <p className="text-sm text-gray-600">
                  意見や考えを英語で明確に表現し、<br />論理的に伝える
                </p>
              </div>
            </FadeInUp>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <FadeInUp delay={0.4}>
              <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-2 border-indigo-200">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  4
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">AI反論</h3>
                <p className="text-sm text-gray-600">
                  AIが異なる視点から反論し、あなたの議論をさらに深める対話を実現
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.5}>
              <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-2 border-green-200">
                <div className="w-14 h-14 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  5
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">フィードバック</h3>
                <p className="text-sm text-gray-600">
                  詳細なフィードバックで表現を改善し、次回の議論に活かす
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Learning Habit Formation Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="mb-12">
              <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold mb-4">
                学習習慣の形成
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                1日10〜15分、英語で深く考えて議論することであなたの力を伸ばします
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 mt-4 max-w-3xl mx-auto text-left">
                初めは大変かもしれませんが、毎日の継続があなたの力になります。<br />フィードバックがあるのでいつでも見直しができ、着実な成長を実感できます。
              </p>
            </div>
          </FadeInUp>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <FadeInUp delay={0.2}>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  1日10〜15分の<br />継続的な成長
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  忙しいビジネスマンでも無理なく続けられる時間設計。毎日の継続があなたの力を確実に伸ばします。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.4}>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  初めは大変かもしれませんが、毎日の継続があなたの力になります
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  深い議論は最初は難しく感じるかもしれませんが、継続することで自然と深い表現力が身につきます。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.6}>
              <div className="bg-gradient-to-br from-pink-50 to-indigo-50 rounded-2xl p-8 border border-pink-100">
                <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  フィードバックがあるので<br />いつでも見直しができ、<br />着実な成長を実感できます
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  詳細なフィードバックで自分の成長を実感し、モチベーションを維持しながら着実に上達できます。
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Trust & Story Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
                信頼・実績
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                開発者ストーリー
              </h2>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 shadow-xl border border-gray-200 max-w-4xl mx-auto">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-6">
                  <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
                    表面的な会話を超えて、真の自分を伝えられた瞬間
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 text-left">
                    開発者自身の原体験として、長年英語を学んできたものの、ビジネスの場面で表面的な会話に終始してしまうことに悩んでいました。
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 text-left">
                    しかし、世界のニュースを題材に深い議論を重ねることで、自分の考えや価値観を英語で表現できるようになりました。
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-left">
                    <span className="font-semibold text-indigo-600">その瞬間、真の自分を伝えられ、信頼関係が生まれ、ビジネスが好転した。</span><br />この体験を多くのビジネスマンに届けたいという想いから、このアプリを開発しました。
                  </p>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold mb-4">
                7日間の無料体験
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                まずは無料で始めて、<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  7日間フル機能をお試しください
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                クレジットカード登録不要。7日間の無料体験後、お気に入りのプランをお選びください。
              </p>
            </div>
          </FadeInUp>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {/* Free Trial Plan */}
            <FadeInUp delay={0.2}>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 relative">
                <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  無料体験
                </div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Trial</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-black text-gray-900">¥0</span>
                    <span className="text-gray-600">/7日間</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">クレジットカード登録不要</p>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">1日1レッスン</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">基本的なAIフィードバック</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">最新ニュース記事の閲覧</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">音声認識による会話練習</span>
                  </li>
                </ul>
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-xs font-semibold text-indigo-900 mb-2">無料体験プランの1日の制限</p>
                  <div className="text-xs text-indigo-700 space-y-1">
                    <p>• レッスン: 1日1レッスンまで</p>
                    <p>• AIコーチング: 1日10メッセージまで</p>
                    <p>• Whisper音声認識: 20分/月まで</p>
                  </div>
                </div>
                <Link href={user ? "/dashboard" : "/signup"}>
                  <button className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-colors">
                    無料で始める
                  </button>
                </Link>
                <p className="text-xs text-gray-500 text-center mt-4">
                  7日間の無料体験後、自動的に課金されることはありません
                </p>
              </div>
            </FadeInUp>

            {/* Basic Plan */}
            <FadeInUp delay={0.4}>
              <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg relative">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-black text-gray-900">¥2,980</span>
                    <span className="text-gray-600">/月</span>
                  </div>
                  <p className="text-sm text-gray-500 line-through mb-1">¥3,000</p>
                  <p className="text-sm text-gray-600 mb-6">年額: ¥29,800（17%オフ）</p>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">無制限レッスン</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AIコーチング（100メッセージ/月）</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">詳細な文法・発音フィードバック</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Notionへの自動保存</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">学習進捗の可視化</span>
                  </li>
                </ul>
                {user ? (
                  <a
                    href="https://buy.stripe.com/cNi5kD8L16tPapN5Wc5gc04"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors text-center"
                  >
                    今すぐ始める
                  </a>
                ) : (
                  <Link href="/signup">
                    <button className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors">
                      今すぐ始める
                    </button>
                  </Link>
                )}
              </div>
            </FadeInUp>

            {/* Premium Plan */}
            <FadeInUp delay={0.6}>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 border-2 border-purple-300 shadow-xl relative">
                <div className="absolute top-4 right-4 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                  人気No.1
                </div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-black text-gray-900">¥4,980</span>
                    <span className="text-gray-600">/月</span>
                  </div>
                  <p className="text-sm text-gray-500 line-through mb-1">¥5,000</p>
                  <p className="text-sm text-gray-600 mb-6">年額: ¥49,800（17%オフ）</p>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-semibold">Basicの全機能</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      <span className="font-semibold text-purple-600">AIコーチング無制限</span>
                      <span className="block text-xs text-purple-500 mt-0.5">（Basicは100メッセージ/月）</span>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">カスタム学習プラン</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">優先サポート</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">週次学習レポート</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">発音分析（詳細版）</span>
                  </li>
                </ul>
                {user ? (
                  <a
                    href="https://buy.stripe.com/00w00j0ev05rcxV84k5gc06"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-full transition-colors shadow-lg text-center"
                  >
                    今すぐ始める
                  </a>
                ) : (
                  <Link href="/signup">
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-full transition-colors shadow-lg">
                      今すぐ始める
                    </button>
                  </Link>
                )}
              </div>
            </FadeInUp>
          </div>

          {/* Comparison Table */}
          <FadeInUp delay={0.8}>
            <div className="mt-12 bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
                BasicとPremiumの違い
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 font-bold text-gray-900">機能</th>
                      <th className="text-center py-4 px-4 font-bold text-indigo-600">Basic<br />¥2,980/月</th>
                      <th className="text-center py-4 px-4 font-bold text-purple-600 bg-purple-50 rounded-lg">Premium<br />¥4,980/月</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">レッスン回数</td>
                      <td className="py-4 px-4 text-center">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 mx-auto" />
                        <span className="text-sm text-gray-600">無制限</span>
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <CheckCircle2 className="w-5 h-5 text-purple-500 mx-auto" />
                        <span className="text-sm text-gray-600">無制限</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">AIコーチング</td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-600">100メッセージ/月</span>
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <span className="text-sm font-semibold text-purple-600">無制限</span>
                        <span className="block text-xs text-purple-500 mt-1">✨ Premium限定</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">文法・発音フィードバック</td>
                      <td className="py-4 px-4 text-center">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 mx-auto" />
                        <span className="text-sm text-gray-600">詳細版</span>
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <CheckCircle2 className="w-5 h-5 text-purple-500 mx-auto" />
                        <span className="text-sm text-gray-600">詳細版</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">発音分析</td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-600">基本版</span>
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <span className="text-sm font-semibold text-purple-600">詳細版</span>
                        <span className="block text-xs text-purple-500 mt-1">✨ Premium限定</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">Notionへの自動保存</td>
                      <td className="py-4 px-4 text-center">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <CheckCircle2 className="w-5 h-5 text-purple-500 mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">学習進捗の可視化</td>
                      <td className="py-4 px-4 text-center">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <CheckCircle2 className="w-5 h-5 text-purple-500 mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">カスタム学習プラン</td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-400">-</span>
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <CheckCircle2 className="w-5 h-5 text-purple-500 mx-auto" />
                        <span className="block text-xs text-purple-500 mt-1">✨ Premium限定</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">週次学習レポート</td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-400">-</span>
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <CheckCircle2 className="w-5 h-5 text-purple-500 mx-auto" />
                        <span className="block text-xs text-purple-500 mt-1">✨ Premium限定</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-700 font-medium">サポート</td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-600">標準サポート</span>
                      </td>
                      <td className="py-4 px-4 text-center bg-purple-50">
                        <span className="text-sm font-semibold text-purple-600">優先サポート</span>
                        <span className="block text-xs text-purple-500 mt-1">✨ Premium限定</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-700 text-center">
                  <span className="font-semibold text-purple-600">Premiumプランの主な違い:</span>
                  <span className="text-gray-600"> AIコーチングが無制限、発音分析が詳細版、カスタム学習プラン、週次レポート、優先サポートが利用可能</span>
                </p>
              </div>
            </div>
          </FadeInUp>

          {/* Trial Period Info */}
          <FadeInUp delay={1.0}>
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start">
                <Clock className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">無料体験について</h4>
                  <p className="text-gray-700 text-sm leading-relaxed mb-2">
                    <span className="font-semibold">7日間の無料体験</span>で、すべての機能をフルにご利用いただけます。
                    クレジットカードの登録は不要です。体験期間中に解約すれば、一切の費用はかかりません。
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    <span className="font-semibold">7日間の無料体験終了後</span>、有料プラン（Basic: ¥2,980/月、Premium: ¥4,980/月）への自動課金は行われません。
                    継続をご希望の場合のみ、お好みのプランをお選びいただけます。
                  </p>
                </div>
              </div>
            </div>
          </FadeInUp>

          {/* Free Trial Daily Limits Info */}
          <FadeInUp delay={1.2}>
            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg max-w-2xl mx-auto">
              <p className="text-xs font-semibold text-indigo-900 mb-2">無料体験プランの1日の制限</p>
              <div className="text-xs text-indigo-700 space-y-1">
                <p>• レッスン: 1日1レッスンまで</p>
                <p>• AIコーチング: 1日10メッセージまで</p>
                <p>• Whisper音声認識: 20分/月まで</p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6">
              3分の英語<br />ディスカッションで、<br />
              本当のあなたを<br />伝える第一歩を
            </h2>
          </FadeInUp>
          
          <FadeInUp delay={0.2}>
            <p className="text-base sm:text-lg md:text-xl text-indigo-100 mb-10 max-w-3xl mx-auto">
              <span className="font-semibold text-white block mb-3">表面的な会話を超えて、英語で"本当のあなた"を伝えたいビジネスマンへ。</span>
              世界のニュースを題材に、<br />
              日本語で考えるような<br />深い会話を英語で実現し、<br />
              真のあなたを知ってもらう<br />
              議論力を身につけましょう。
            </p>
          </FadeInUp>

          <FadeInUp delay={0.4}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={user ? "/dashboard" : "/signup"}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group px-10 py-5 bg-white hover:bg-gray-50 text-indigo-600 font-bold text-lg rounded-full shadow-xl flex items-center space-x-2"
                >
                  <span>無料体験を始める</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/login">
                <button className="px-10 py-5 bg-transparent hover:bg-white/10 text-white font-bold text-lg rounded-full border-2 border-white/30 transition-colors">
                  ログイン
                </button>
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Logged-in Pricing Section */}
      {user && (
        <section className="py-20 px-6 bg-gradient-to-b from-white to-indigo-50">
          <div className="max-w-6xl mx-auto">
            <FadeInUp>
              <div className="text-center mb-12">
                <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
                  プラン選択
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  お気に入りのプランをお選びください
                </h2>
                <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
                  無料体験後、継続をご希望の場合のみプランをお選びいただけます
                </p>
              </div>
            </FadeInUp>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {/* Free Plan Button */}
              <FadeInUp delay={0.2}>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">無料体験</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-gray-900">¥0</span>
                    <span className="text-gray-600">/7日間</span>
                  </div>
                  <Link href="/dashboard">
                    <button className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-colors">
                      無料で続ける
                    </button>
                  </Link>
                </div>
              </FadeInUp>

              {/* Basic Plan Button */}
              <FadeInUp delay={0.4}>
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg text-center">
                  <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-gray-900">¥2,980</span>
                    <span className="text-gray-600">/月</span>
                  </div>
                  <a
                    href="https://buy.stripe.com/cNi5kD8L16tPapN5Wc5gc04"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors"
                  >
                    今すぐ始める
                  </a>
                </div>
              </FadeInUp>

              {/* Premium Plan Button */}
              <FadeInUp delay={0.6}>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 border-2 border-purple-300 shadow-xl text-center relative">
                  <div className="absolute top-4 right-4 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                    人気No.1
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-gray-900">¥4,980</span>
                    <span className="text-gray-600">/月</span>
                  </div>
                  <a
                    href="https://buy.stripe.com/00w00j0ev05rcxV84k5gc06"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-full transition-colors shadow-lg"
                  >
                    今すぐ始める
                  </a>
                </div>
              </FadeInUp>
            </div>

            <FadeInUp delay={0.8}>
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">自動課金について</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      <span className="font-semibold">自動課金は一切発生しません。</span>
                      選択したプランのみ決済されます。いつでもキャンセル可能です。
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold">DeepSpeak</span>
          </div>
          <div className="mb-4">
            <Link
              href="/feedback"
              className="inline-flex items-center justify-center px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 transition-colors rounded-full text-sm font-semibold"
            >
              フィードバックを送る
            </Link>
          </div>
          <p className="text-sm">© 2026 DeepSpeak. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
