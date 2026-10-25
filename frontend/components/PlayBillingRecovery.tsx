'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/lib/auth-context';
import { useAndroidApp } from '@/components/AppEnv';
import { hasPendingPurchases, isPlayBillingSupported, recoverPurchases } from '@/lib/playBilling';

const RELOADED_KEY = 'deepspeak_play_recovered_reload';

/**
 * Android アプリ内でログイン済みのとき、確認できていないGoogle Play購入を自動で再確認する。
 * 購入直後の確認が失敗しても（未ログイン・通信エラー等）、ここで承認とプラン反映をやり直せる。
 * 画面には何も表示しない。
 */
export function PlayBillingRecovery() {
  const { user } = useAuth();
  const isApp = useAndroidApp();

  useEffect(() => {
    if (!user || isApp !== true || !isPlayBillingSupported()) return;
    let cancelled = false;
    const force = hasPendingPurchases();
    recoverPurchases(force).then((n) => {
      if (cancelled || n <= 0) return;
      // 反映されたプランを画面に出すため、1回だけ再読み込みする（連続再読み込みの防止付き）
      try {
        const last = Number(sessionStorage.getItem(RELOADED_KEY) || 0);
        if (Date.now() - last < 60_000) return;
        sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
      } catch {
        return;
      }
      window.location.reload();
    });
    return () => {
      cancelled = true;
    };
  }, [user, isApp]);

  return null;
}
