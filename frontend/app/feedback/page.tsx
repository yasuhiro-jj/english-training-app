"use client";

import React from 'react';
import FeedbackForm from '../../components/FeedbackForm';
import { useAuth } from '../lib/auth-context';

export default function FeedbackPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Main Content */}
      <main className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
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
