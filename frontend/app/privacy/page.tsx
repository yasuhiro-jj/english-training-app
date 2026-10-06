import Link from 'next/link';

export const metadata = {
  title: 'プライバシーポリシー | DeepSpeak',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          プライバシーポリシー
        </h1>
        <p className="text-sm text-gray-500 mb-8">最終更新日: 2026年9月28日</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. はじめに</h2>
            <p>
              本プライバシーポリシーは、DeepSpeak(以下「本サービス」)における、ユーザーの個人情報の取り扱いについて定めるものです。本サービスをご利用いただくことで、本ポリシーに同意いただいたものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. 収集する情報</h2>
            <p className="mb-2">本サービスは、以下の情報を収集します。</p>
            <ul className="list-disc list-inside space-y-1">
              <li>メールアドレス(アカウント登録・ログインに使用)</li>
              <li>パスワード(暗号化して保存し、運営者を含め第三者が平文で閲覧することはありません)</li>
              <li>学習・会話ログ(テキストでの発言内容、AIによる添削・フィードバック内容)</li>
              <li>音声データ(音声入力機能をご利用の場合、発話内容をテキスト化するために一時的に処理されます)</li>
              <li>決済情報(プラン契約時。カード番号等の決済情報自体は本サービスのサーバーには保存されず、後述する決済代行事業者が管理します)</li>
              <li>アプリの利用状況(学習回数、セッション履歴などのサービス改善に必要な範囲の利用ログ)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. 情報の利用目的</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>アカウントの認証およびログイン状態の維持</li>
              <li>AIによる英語学習コンテンツ・フィードバックの生成</li>
              <li>学習履歴の記録・表示によるユーザー体験の提供</li>
              <li>有料プランの契約・課金管理</li>
              <li>サービスの不具合対応、品質改善、不正利用の防止</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. 第三者への提供・業務委託</h2>
            <p className="mb-2">
              本サービスは、以下の外部サービスを利用してデータを処理しています。それぞれの外部サービスは、各社独自のプライバシーポリシーおよびセキュリティ基準に基づいてデータを取り扱います。
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-semibold">OpenAI, L.L.C.</span> — 入力されたテキスト・音声データをAIによる応答生成・音声認識のために処理します</li>
              <li><span className="font-semibold">Stripe, Inc.</span> — Webブラウザからの決済処理・サブスクリプション管理を行います。カード情報等はStripeが直接管理し、本サービスのサーバーには保存されません</li>
              <li><span className="font-semibold">Google LLC(Google Play)</span> — Androidアプリからの決済処理・定期購入管理を行います。お支払い情報はGoogleが直接管理し、本サービスのサーバーには保存されません。本サービスは、購入の確認のため、購入トークンと購入状態(プラン・有効期限)をGoogle Play Developer APIを通じて取得し、アカウントに紐づけて保存します</li>
              <li><span className="font-semibold">Notion Labs, Inc.</span> — アカウント情報・学習履歴データの保管先として利用しています</li>
            </ul>
            <p className="mt-2">
              法令に基づく場合を除き、上記以外の第三者へユーザーの個人情報を提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Cookie等の利用</h2>
            <p>
              本サービスは、ログイン状態を維持するために、認証情報を含むCookie(httpOnly Cookie)を使用します。これは本サービスの機能提供に必要な最小限の利用であり、広告目的でのトラッキングには使用していません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">6. データの保管期間</h2>
            <p>
              ユーザーの個人情報は、アカウントが有効である間保持されます。アカウント削除のご依頼をいただいた場合、法令上保存が必要な場合を除き、合理的な期間内にデータを削除します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">7. お子様の情報について</h2>
            <p>
              本サービスは13歳未満のお子様を対象としていません。13歳未満のお子様から意図的に個人情報を収集することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">8. ユーザーの権利</h2>
            <p>
              ユーザーは、自身の個人情報の開示、訂正、削除を運営者に対して請求することができます。ご希望の場合は、下記のお問い合わせ先までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">9. プライバシーポリシーの変更</h2>
            <p>
              本ポリシーの内容は、法令の変更やサービス内容の変更に応じて、予告なく改定される場合があります。重要な変更がある場合は、本サービス内での告知等により周知します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">10. お問い合わせ先</h2>
            <p>
              本ポリシーに関するお問い合わせは、以下のメールアドレスまでお願いいたします。
            </p>
            <p className="mt-2 font-semibold">yasuhiro.watanabe1@gmail.com</p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-indigo-600 font-semibold hover:text-indigo-500 transition-colors">
            ← ホームへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
