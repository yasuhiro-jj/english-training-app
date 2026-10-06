'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { isAndroidApp } from '@/lib/playBilling';

const subscribe = () => () => {};
const getServerSnapshot = (): boolean | null => null;

/**
 * Android アプリ(TWA)内かどうか。
 * サーバー描画・ハイドレーション中は null を返す。外部決済への導線は `=== false`（Web確定）のときだけ出すこと。
 */
export function useAndroidApp(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribe, isAndroidApp, getServerSnapshot);
}

/** Web ブラウザでのみ表示する（判定前・アプリ内では非表示） */
export function WebOnly({ children }: { children: ReactNode }) {
  const isApp = useAndroidApp();
  return isApp === false ? <>{children}</> : null;
}

/** Android アプリ内でのみ表示する */
export function AndroidOnly({ children }: { children: ReactNode }) {
  const isApp = useAndroidApp();
  return isApp === true ? <>{children}</> : null;
}
