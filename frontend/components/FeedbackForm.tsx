"use client";

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface FeedbackFormProps {
  userEmail?: string;
  userName?: string;
}

export default function FeedbackForm({ userEmail, userName }: FeedbackFormProps) {
  const [content, setContent] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [name, setName] = useState(userName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          email: email || undefined,
          name: name || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage(data.message || 'フィードバックを送信しました！');
        setContent('');
        if (!userEmail) setEmail('');
        if (!userName) setName('');
      } else {
        setMessageType('error');
        setMessage(data.detail || 'フィードバックの送信に失敗しました');
      }
    } catch (error) {
      setMessageType('error');
      setMessage('ネットワークエラーが発生しました。もう一度お試しください。');
      console.error('Feedback submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!userEmail && (
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス（任意）
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            placeholder="your@email.com"
          />
        </div>
      )}

      {!userName && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            お名前（任意）
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            placeholder="山田太郎"
          />
        </div>
      )}

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          フィードバック内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
          rows={6}
          placeholder="DeepSpeakへのご意見、改善点、バグ報告などをお聞かせください..."
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          具体的なご意見をいただけると、より良いサービス改善につながります。
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !content.trim()}
        className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <span>送信中...</span>
        ) : (
          <>
            <span>送信する</span>
            <Send className="w-4 h-4" />
          </>
        )}
      </button>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            messageType === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
