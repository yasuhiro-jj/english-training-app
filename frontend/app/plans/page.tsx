import Link from 'next/link';
import { PlanCards } from '../../components/PlanCards';

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            プランを選択
          </h1>
          <p className="mt-3 text-gray-700">
            ご希望のプランを選択して決済に進んでください。
          </p>
          <p className="mt-2 text-sm text-indigo-700 font-semibold">
            ⚠️ 自動課金は一切発生しません。選択したプランのみ決済されます。
          </p>
        </header>

        <PlanCards />

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 font-semibold text-gray-800 transition-colors"
          >
            ダッシュボードへ戻る
          </Link>
          <Link
            href="/"
            className="px-6 py-3 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
          >
            ホームへ
          </Link>
        </div>
      </div>
    </div>
  );
}

