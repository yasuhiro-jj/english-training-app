"use client";

import React from 'react';
import FeedbackForm from '../../components/FeedbackForm';
import { BookOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function FeedbackPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">DeepSpeak</span>
          </Link>
          <Link
            href="/"
            className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>トップに戻る</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                フィードバックを送る
              </h1>
              <p className="text-gray-600 leading-relaxed">
                DeepSpeakへのご意見や改善点をお聞かせください。<br />
                いただいたフィードバックは、今後のサービス改善に活用させていただきます。
              </p>
            </div>

            <FeedbackForm 
              userEmail={user?.email} 
              userName={user?.name}
            />
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              お送りいただいたフィードバックは、開発チームが確認いたします。<br />
              個別の返信はお約束できませんが、すべてのご意見を大切に検討させていただきます。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
