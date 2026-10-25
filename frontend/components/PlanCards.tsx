'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  stripePaymentLinkBasicMonthly,
  stripePaymentLinkBasicYearly,
  stripePaymentLinkPremiumMonthly,
  stripePaymentLinkPremiumYearly,
} from '@/lib/stripePaymentLinks';
import { useAndroidApp } from '@/components/AppEnv';
import { useAuth } from '@/app/lib/auth-context';
import { api, SubscriptionInfo } from '@/lib/api';
import {
  PLAY_PRODUCT_IDS,
  PlanKey,
  PlayPurchaseCancelled,
  PlayPurchaseError,
  PurchaseStage,
  STAGE_LABELS,
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
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; title?: string; text: string } | null>(null);
  const [stage, setStage] = useState<PurchaseStage | null>(null);
  const { user, loading: authLoading } = useAuth();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);

  // 現在のプラン（購入済みか）を取得する。取得できなくても、購入画面自体は使えるようにする
  useEffect(() => {
    if (!user) {
      setSub(null);
      return;
    }
    let cancelled = false;
    api.getSubscription().then((s) => { if (!cancelled) setSub(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const activePlan: 'basic' | 'premium' | null =
    sub && sub.status === 'active' && (sub.plan === 'basic' || sub.plan === 'premium') ? sub.plan : null;
  const activePlanLabel = activePlan === 'premium' ? 'Premium' : 'Basic';

  useEffect(() => {
    if (playSupported) fetchLocalizedPrices().then(setPrices);
  }, [playSupported]);

  const buy = async (key: PlanKey) => {
    setMessage(null);
    if (!user) {
      setMessage({
        type: 'error',
        title: 'ログインが必要です',
        text: '購入の前に、ログインしてください。ログインしていない状態で購入すると、プランを反映できません。',
      });
      return;
    }
    setBusyKey(key);
    setStage('preparing');
    try {
      const result = await purchasePlan(key, setStage);
      setMessage({ type: 'ok', text: `${result.plan} プランが有効になりました。` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      if (e instanceof PlayPurchaseCancelled) return;
      if (e instanceof PlayPurchaseError) {
        setMessage({
          type: 'error',
          title: `${STAGE_LABELS[e.stage]}で失敗しました`,
          text: e.pendingRetry
            ? `購入は完了していますが、サーバーでの確認に失敗しました（${e.message}）。この端末に購入情報を保存してあり、次にアプリを開いたとき、またはログインしたときに自動で再確認します。すぐに反映したい場合は、ログインしたうえで「購入を復元する」を押してください。`
            : e.message,
        });
      } else {
        setMessage({
          type: 'error',
          title: '購入に失敗しました',
          text: e instanceof Error ? e.message : '不明なエラー',
        });
      }
    } finally {
      setBusyKey(null);
      setStage(null);
    }
  };

  const restore = async () => {
    setMessage(null);
    if (!user) {
      setMessage({ type: 'error', title: 'ログインが必要です', text: 'ログインしてから、もう一度押してください。' });
      return;
    }
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
    {activePlan && (
      <div role="status" className="mb-4 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="text-base font-bold">現在のプラン: {activePlanLabel}(有効)</p>
        {mode === 'android' ? (
          <p className="mt-1">
            Google Play の定期購入で管理されています。プランの変更・解約は、Google Play の「定期購入」から行えます。
            二重に購入しないよう、購入ボタンは無効にしています。
          </p>
        ) : (
          <p className="mt-1">ご利用中のプランです。</p>
        )}
        {mode === 'android' && (
          <a
            href="https://play.google.com/store/account/subscriptions"
            className="mt-2 inline-block font-bold text-indigo-700 underline"
          >
            Google Play の定期購入を開く
          </a>
        )}
      </div>
    )}
    {mode === 'android' && !authLoading && !user && (
      <div role="alert" className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-bold">購入にはログインが必要です</p>
        <p className="mt-1">ログインしてから、プランを選んでください。</p>
        <Link href="/login" className="mt-2 inline-block font-bold text-indigo-700 underline">
          ログインする
        </Link>
      </div>
    )}
    {mode === 'android' && (
      <p className="mb-4 text-xs text-gray-600">
        定期購入は自動更新されます。解約は Google Play の「定期購入」からいつでも行えます。
      </p>
    )}
    {stage && (
      <p role="status" className="mb-4 rounded-lg bg-indigo-50 p-3 text-center text-sm font-semibold text-indigo-800">
        処理中: {STAGE_LABELS[stage]}…（画面を閉じずにお待ちください）
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

            {activePlan && p.planName.toLowerCase() === activePlan ? (
              <div
                aria-disabled="true"
                className="block w-full px-6 py-3 text-center font-bold rounded-lg border-2 border-emerald-500 bg-emerald-50 text-emerald-700"
              >
                ✓ 現在のプラン
              </div>
            ) : mode === 'android' ? (
              <button
                type="button"
                disabled={busyKey !== null || activePlan !== null}
                onClick={() => buy(p.key as PlanKey)}
                className={`block w-full px-6 py-3 text-white font-bold rounded-lg transition-colors text-center disabled:opacity-60 ${t.button}`}
              >
                {busyKey === p.key
                  ? '処理中...'
                  : activePlan
                    ? 'Google Play で変更'
                    : `${p.planName} ${p.billing}プランを購入`}
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
      <div
        role={message.type === 'error' ? 'alert' : 'status'}
        className={`mt-4 rounded-lg border-2 p-4 text-sm ${
          message.type === 'ok'
            ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
            : 'border-red-400 bg-red-50 text-red-900'
        }`}
      >
        {message.title && <p className="font-bold">{message.title}</p>}
        <p className={message.title ? 'mt-1' : 'font-semibold'}>{message.text}</p>
      </div>
    )}
    </div>
  );
}

