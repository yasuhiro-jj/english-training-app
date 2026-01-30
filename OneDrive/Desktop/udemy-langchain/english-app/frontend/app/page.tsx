"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Zap, Globe, BookOpen, MessageSquare, TrendingUp, CheckCircle2, Clock, BarChart3, Eye, Target, AlertCircle, RefreshCw, Sparkles, Crown } from "lucide-react";
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Daily News English</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors"
              >
                ダッシュボードへ
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900 font-semibold transition-colors"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors"
                >
                  無料で始める
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <FadeInUp>
            <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
              AI-POWERED ENGLISH TRAINING
            </div>
          </FadeInUp>
          
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                英会話中級者向け
              </div>
              <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                7日間の無料体験
              </div>
            </div>
          </FadeInUp>
          
          <FadeInUp delay={0.2}>
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
              最新ニュースで学ぶ<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                実践的な英会話力
              </span>
            </h1>
          </FadeInUp>
          
          <FadeInUp delay={0.4}>
            <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
              最新記事から、あなただけの英会話レッスンを自動生成。<br />
              <span className="font-semibold text-gray-900">中級者ならではの発音の癖・文法の癖を視覚的に可視化し、</span><br />
              AIがフィードバックで常にあなたの癖を直していく機能を搭載。
            </p>
            <p className="text-lg text-green-600 font-semibold mb-10">
              ✓ クレジットカード登録不要 ✓ 7日間フル機能をお試し ✓ 体験終了後も自動課金なし
            </p>
          </FadeInUp>

          <FadeInUp delay={0.6}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={user ? "/dashboard" : "/signup"}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-full shadow-lg shadow-indigo-500/30 flex items-center space-x-2"
                >
                  <span>無料で始める</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/login">
                <button className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-bold text-lg rounded-full border-2 border-gray-200 transition-colors">
                  ログイン
                </button>
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              こんなお悩みありませんか？
            </h2>
          </FadeInUp>
          
          <FadeInUp delay={0.2}>
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <ProblemCard
                icon={Brain}
                title="パッと出てこない"
                desc="知っている表現なのに、とっさの場面になると詰まってしまう..."
              />
              <ProblemCard
                icon={MessageSquare}
                title="表現の幅が広がらない"
                desc="ついつい同じ表現ばかりに逃げてしまう…"
              />
              <ProblemCard
                icon={AlertCircle}
                title="自分の癖に気づけない"
                desc="中級者ならではの発音の癖や文法の癖が、自分では分からない…"
              />
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              英会話力が伸びないワケ
            </h2>
          </FadeInUp>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <FadeInUp delay={0.2}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <div className="text-6xl font-bold text-indigo-600 mb-4">01</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  インプットトレーニングが<br />足りていない
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  英会話はあくまで「実践」「力試し」の場であり、それだけではスピーキング力は向上しません。
                  課題を解消するには、課題に合わせたトレーニングを行うことが不可欠です。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.4}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <div className="text-6xl font-bold text-indigo-600 mb-4">02</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  アウトプットを振り返っていない
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  単にアウトプットするだけで終わってしまうと、スピーキング力は向上しません。
                  アウトプットした内容を振り返り復習をすることで、次回の発話に活かせるようPDCAを回すことが重要です。
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              「インプット」×「アウトプット」<br />
              をスマホ1つで完結
            </h2>
          </FadeInUp>
          
          <FadeInUp delay={0.2}>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              最新ニュース記事を読んで理解し、AIとの対話で実践練習。<br />
              フィードバックを振り返ることで、「瞬発力」「表現の幅」の課題を解決。
            </p>
          </FadeInUp>

          <div className="grid md:grid-cols-2 gap-8">
            <SolutionCard
              number="01"
              title="Daily News English レッスン"
              desc="最新記事から、あなたのレベルに合わせた英会話レッスンを自動生成。"
              features={[
                "最新のニュース記事を教材化",
                "初中級(B1)・中上級(B2)の2レベル対応",
                "重要語彙と例文を自動抽出",
                "Read Aloud機能で発音練習"
              ]}
            />

            <SolutionCard
              number="02"
              title="AI会話トレーニング"
              desc="音声認識で自然な会話練習。AIが中級者特有の発音の癖・文法の癖を視覚的に可視化し、詳細なフィードバックを提供。"
              features={[
                "会話中は止めない自然な流れ",
                "中級者特有の癖を自動検出・可視化",
                "発音・文法・表現の3つの視点から改善提案",
                "フィードバックを蓄積し、癖を常に修正"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-4">
                中級者専用設計
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                中級者ならではの<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                  発音の癖・文法の癖を可視化
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                初級者には見えない、中級者特有の細かい癖をAIが発見。<br />
                視覚的なフィードバックで、あなたの癖を常に修正していきます。
              </p>
            </div>
          </FadeInUp>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <FadeInUp delay={0.2}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-200">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mb-6">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">癖の可視化</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  中級者特有の細かい発音の癖や文法の癖を、AIが自動的に検出。あなたが気づいていない繰り返しのミスを、視覚的に分かりやすく表示します。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">発音の癖（L/R、TH音など）を自動検出</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">文法の癖（時制、前置詞の使い方など）を可視化</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">繰り返し使う不自然な表現を特定</span>
                  </li>
                </ul>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.4}>
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-indigo-200">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">継続的な癖の修正</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  フィードバックを蓄積し、あなたの癖を常に追跡。同じミスを繰り返さないよう、パーソナライズされた改善提案を提供します。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">過去のフィードバックから傾向を分析</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">改善されたポイントを可視化</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Notionに自動保存で振り返り可能</span>
                  </li>
                </ul>
              </div>
            </FadeInUp>
          </div>

          {/* Visual Feedback Example */}
          <FadeInUp delay={0.6}>
            <div className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-200">
              <div className="flex items-center mb-6">
                <RefreshCw className="w-8 h-8 text-indigo-600 mr-4" />
                <h3 className="text-2xl font-bold text-gray-900">フィードバックの流れ</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">1</div>
                  <h4 className="font-bold text-gray-900 mb-2">発話</h4>
                  <p className="text-sm text-gray-600">英語で自然に話す</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="text-3xl font-bold text-purple-600 mb-2">2</div>
                  <h4 className="font-bold text-gray-900 mb-2">AI分析</h4>
                  <p className="text-sm text-gray-600">癖を自動検出・可視化</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="text-3xl font-bold text-green-600 mb-2">3</div>
                  <h4 className="font-bold text-gray-900 mb-2">改善</h4>
                  <p className="text-sm text-gray-600">フィードバックで癖を修正</p>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              Daily News Englishだから<br />
              実践力が伸びる3つの理由
            </h2>
          </FadeInUp>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <FeatureCard
              icon={Globe}
              title="最新のニュース記事"
              desc="毎日更新される実際のニュース記事を使用。単なる語学学習を超え、世界のトレンドを英語で議論する知性を養います。"
              delay={0.2}
            />
            <FeatureCard
              icon={Zap}
              title="AIによる即座のフィードバック"
              desc="あなたの発話をAIが瞬時に解析。文法だけでなく、ニュアンスや自然さまで理解し、最適な表現をフィードバックします。"
              delay={0.4}
            />
            <FeatureCard
              icon={BarChart3}
              title="学習進捗の可視化"
              desc="ダッシュボードで学習時間、セッション数、改善ポイントを一目で確認。継続的な成長を実感できます。"
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
              使い方は簡単、3ステップ
            </h2>
          </FadeInUp>

          <div className="grid md:grid-cols-3 gap-8">
            <FadeInUp delay={0.2}>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">レッスン生成</h3>
                <p className="text-gray-600">
                  ボタン一つで、今日のニュース記事から英会話レッスンを自動生成
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.4}>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">記事を読む</h3>
                <p className="text-gray-600">
                  重要語彙を確認しながら記事を読み、Read Aloudで発音練習
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.6}>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">会話練習</h3>
                <p className="text-gray-600">
                  音声認識で英語で話し、AIから詳細なフィードバックを受け取る
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Continuation Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInUp>
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              「続けられる仕組み」があるから、<br />
              もう挫折しない
            </h2>
          </FadeInUp>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <FadeInUp delay={0.2}>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  あなたの発話の<br />成長を可視化
                </h3>
                <p className="text-gray-600">
                  ダッシュボードで学習時間、セッション数、改善ポイントを一目で確認できます。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.4}>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  1日1レッスンからでも<br />学習できる
                </h3>
                <p className="text-gray-600">
                  忙しい日でも、1つのレッスンから始められます。無理なく継続できる設計です。
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.6}>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  "やった証拠"が見える<br />学習履歴
                </h3>
                <p className="text-gray-600">
                  過去のレッスンとフィードバックを振り返り、継続しやすい仕組みを提供します。
                </p>
              </div>
            </FadeInUp>
          </div>
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
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                まずは無料で始めて、<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  7日間フル機能をお試しください
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
                <Link href={user ? "/dashboard" : "/signup"}>
                  <button className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-colors">
                    今すぐ始める
                  </button>
                </Link>
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
                <Link href={user ? "/dashboard" : "/signup"}>
                  <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-full transition-colors shadow-lg">
                    今すぐ始める
                  </button>
                </Link>
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              中級者ならではの癖を直して、<br />
              実践的な英会話力を身につけよう
            </h2>
          </FadeInUp>
          
          <FadeInUp delay={0.2}>
            <p className="text-xl text-indigo-100 mb-10 max-w-3xl mx-auto">
              <span className="font-semibold text-white">7日間の無料体験</span>で、すべての機能をお試しください。<br />
              クレジットカード登録不要。体験期間中に解約すれば、一切の費用はかかりません。<br />
              <span className="font-semibold text-white">AIがあなたの発音の癖・文法の癖を視覚的に可視化し、</span><br />
              フィードバックで常に改善していきます。
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
                  <span>無料で始める</span>
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

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold">Daily News English</span>
          </div>
          <p className="text-sm">© 2026 Daily News English. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
