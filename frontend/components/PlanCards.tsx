'use client';

import { useEffect, useState } from 'react';
import {
  stripePaymentLinkBasicMonthly,
  stripePaymentLinkBasicYearly,
  stripePaymentLinkPremiumMonthly,
  stripePaymentLinkPremiumYearly,
} from '@/lib/stripePaymentLinks';
import { useAndroidApp } from '@/components/AppEnv';
import {
  PLAY_PRODUCT_IDS,
  PlanKey,
  PlayPurchaseCancelled,
  fetchLocalizedPrices,
  isPlayBillingSupported,
  purchasePlan,
  restorePurchases,
} from '@/lib/playBilling';

type PlanCard = {
  key: string;
  planName: 'Basic' | 'Premium';
  billing: '月額' | '年間';
  priceMain: string;
  priceSub?: string;
  badge?: string;
  description: string;
  href: string;
  theme: 'indigo' | 'purple';
};

const PLANS: PlanCard[] = [
  {
    key: 'basic-monthly',
    planName: 'Basic',
    billing: '月額',
    priceMain: '¥2,980',
    priceSub: '/月',
    description: '月額制のプランです。いつでもキャンセル可能です。',
    href: stripePaymentLinkBasicMonthly,
    theme: 'indigo',
  },
  {
    key: 'basic-yearly',
    planName: 'Basic',
    billing: '年間',
    priceMain: '¥29,800',
    priceSub: '/年',
    badge: 'お得',
    description: '1年分をまとめて購入。月額より約17%お得です。',
    href: stripePaymentLinkBasicYearly,
    theme: 'indigo',
  },
  {
    key: 'premium-monthly',
    planName: 'Premium',
    billing: '月額',
    priceMain: '¥4,980',
    priceSub: '/月',
    description: '月額制のプランです。いつでもキャンセル可能です。',
    href: stripePaymentLinkPremiumMonthly,
    theme: 'purple',
  },
  {
    key: 'premium-yearly',
    planName: 'Premium',
    billing: '年間',
    priceMain: '¥49,800',
    priceSub: '/年',
    badge: 'お得',
    description: '1年分をまとめて購入。月額より約17%お得です。',
    href: stripePaymentLinkPremiumYearly,
    theme: 'purple',
  },
];

function themeClasses(theme: PlanCard['theme']) {
  if (theme === 'indigo') {
    return {
      border: 'border-indigo-200 hover:border-indigo-400',
      pillBg: 'bg-indigo-100',
      pillText: 'text-indigo-700',
      price: 'text-indigo-600',
      button: 'bg-indigo-600 hover:bg-indigo-700',
      badge: 'bg-emerald-500',
    };
  }

  return {
    border: 'border-purple-200 hover:border-purple-400',
    pillBg: 'bg-purple-100',
    pillText: 'text-purple-700',
    price: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-emerald-500',
  };
}

type Mode = 'checking' | 'web' | 'android';

export function PlanCards() {
  const isApp = useAndroidApp();
  const mode: Mode = isApp === null ? 'checking' : isApp ? 'android' : 'web';
  const playSupported = mode === 'android' && isPlayBillingSupported();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (playSupported) fetchLocalizedPrices().then(setPrices);
  }, [playSupported]);

  const buy = async (key: PlanKey) => {
    setMessage(null);
    setBusyKey(key);
    try {
      const result = await purchasePlan(key);
      setMessage({ type: 'ok', text: `${result.plan} プランが有効になりました。` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      if (e instanceof PlayPurchaseCancelled) return;
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '購入に失敗しました' });
    } finally {
      setBusyKey(null);
    }
  };

  const restore = async () => {
    setMessage(null);
    setBusyKey('restore');
    try {
      const n = await restorePurchases();
      setMessage(
        n > 0
          ? { type: 'ok', text: '購入を復元しました。' }
          : { type: 'error', text: '復元できる購入が見つかりませんでした。' },
      );
      if (n > 0) setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : '復元に失敗しました' });
    } finally {
      setBusyKey(null);
    }
  };

  if (mode === 'checking') {
    return <div className="min-h-[200px]" aria-busy="true" />;
  }

  if (mode === 'android' && !playSupported) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-gray-700 text-sm">
        この端末では、アプリ内での購入を利用できません。Google Play ストアからアプリを更新してから、もう一度お試しください。
      </div>
    );
  }

  return (
    <div>
    {mode === 'android' && (
      <p className="mb-4 text-xs text-gray-600">
        定期購入は自動更新されます。解約は Google Play の「定期購入」からいつでも行えます。
      </p>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PLANS.map((p) => {
        const t = themeClasses(p.theme);
        return (
          <div
            key={p.key}
            className={`bg-white border-2 rounded-xl p-6 transition-all relative ${t.border}`}
          >
            {p.badge && (
              <div className={`absolute -top-2.5 left-4 px-2 py-0.5 text-white text-xs font-bold rounded-full shadow-sm ${t.badge}`}>
                {p.badge}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xl font-bold text-gray-900">{p.planName} プラン</h4>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${t.pillBg} ${t.pillText}`}>
                {p.billing}
              </span>
            </div>

            <div className="mb-3">
              <span className={`text-3xl font-black ${t.price}`}>
                {(mode === 'android' && prices[PLAY_PRODUCT_IDS[p.key as PlanKey]]) || p.priceMain}
              </span>
              {p.priceSub && <span className="text-gray-600 text-sm ml-2">{p.priceSub}</span>}
              {p.key === 'basic-yearly' && (
                <div className="text-xs text-emerald-600 font-semibold mt-1">(月額 ¥2,483相当)</div>
              )}
              {p.key === 'premium-yearly' && (
                <div className="text-xs text-emerald-600 font-semibold mt-1">(月額 ¥4,150相当)</div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">{p.description}</p>

            {mode === 'android' ? (
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => buy(p.key as PlanKey)}
                className={`block w-full px-6 py-3 text-white font-bold rounded-lg transition-colors text-center disabled:opacity-60 ${t.button}`}
              >
                {busyKey === p.key ? '処理中...' : `${p.planName} ${p.billing}プランを購入`}
              </button>
            ) : (
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full px-6 py-3 text-white font-bold rounded-lg transition-colors text-center ${t.button}`}
              >
                {p.planName} {p.billing}プランを選択
              </a>
            )}
          </div>
        );
      })}
    </div>
    {mode === 'android' && (
      <div className="mt-4 text-center">
        <button
          type="button"
          disabled={busyKey !== null}
          onClick={restore}
          className="text-sm text-indigo-700 underline disabled:opacity-60"
        >
          {busyKey === 'restore' ? '確認中...' : '購入を復元する'}
        </button>
      </div>
    )}
    {message && (
      <p
        role="status"
        className={`mt-4 text-sm text-center font-semibold ${
          message.type === 'ok' ? 'text-emerald-700' : 'text-red-600'
        }`}
      >
        {message.text}
      </p>
    )}
    </div>
  );
}

