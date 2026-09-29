import Link from 'next/link';

export const metadata = {
  title: 'アカウント削除について | DeepSpeak',
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          DeepSpeak アカウントの削除について
        </h1>
        <p className="text-sm text-gray-500 mb-8">最終更新日: 2026年9月29日</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <p>
              DeepSpeakのアカウントおよび関連データの削除をご希望の場合は、以下の手順でご依頼ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">削除リクエストの方法</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                以下のメールアドレス宛に、件名「アカウント削除依頼」で、登録済みのメールアドレスを明記のうえご連絡ください。
                <p className="mt-1 font-semibold">yasuhiro.watanabe1@gmail.com</p>
              </li>
              <li>
                本人確認のため、登録メールアドレスからのご連絡をお願いしております。
              </li>
              <li>
                ご依頼受領後、原則として<span className="font-semibold">14日以内</span>に削除処理を完了します。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">削除されるデータ</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>アカウント情報(メールアドレス、パスワードのハッシュ値)</li>
              <li>学習・会話ログ、AIによるフィードバック履歴</li>
              <li>サブスクリプション・決済に関する紐付け情報(決済自体の記録はStripe側の法令上の保存義務に基づき別途保持される場合があります)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">保持されるデータ</h2>
            <p>
              法令上の記録保持義務がある場合(決済に関する会計記録等)を除き、上記のデータはすべて削除されます。法令に基づき保持が必要なデータについては、必要最小限の範囲・期間で保持し、それ以外の目的には使用しません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">アカウントを削除せずデータの一部削除のみを希望する場合</h2>
            <p>
              学習履歴のみの削除など、アカウント自体は維持したままデータの一部削除をご希望の場合も、同じメールアドレスまでご相談ください。個別に対応いたします。
            </p>
          </section>

          <section>
            <p className="text-sm text-gray-500">
              取り扱いの詳細については<Link href="/privacy" className="text-indigo-600 font-semibold hover:text-indigo-500">プライバシーポリシー</Link>もあわせてご確認ください。
            </p>
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
