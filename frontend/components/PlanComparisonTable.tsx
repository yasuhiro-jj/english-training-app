import { CheckCircle2 } from 'lucide-react';

export function PlanComparisonTable() {
  return (
    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
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
  );
}
