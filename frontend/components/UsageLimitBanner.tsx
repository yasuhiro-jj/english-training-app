'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { api, SubscriptionInfo } from '../lib/api';

const HIDDEN_PATHS = ['/', '/login', '/signup', '/plans'];
const WARN_WITHIN_DAYS = 3;

function daysLeft(endsAt: string | null): number | null {
    if (!endsAt) return null;
    const ms = new Date(endsAt).getTime() - Date.now();
    if (Number.isNaN(ms)) return null;
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function UsageLimitBanner() {
    const pathname = usePathname();
    const [sub, setSub] = useState<SubscriptionInfo | null>(null);

    useEffect(() => {
        if (HIDDEN_PATHS.includes(pathname || '')) return;
        let token: string | null = null;
        try {
            token = localStorage.getItem('auth_token');
        } catch {
            // localStorageが使えない環境では何も表示しない
        }
        if (!token) return;

        let cancelled = false;
        api.getSubscription()
            .then((info) => {
                if (!cancelled) setSub(info);
            })
            .catch(() => {
                // お知らせは補助的な表示のため、取得に失敗しても何もしない
            });
        return () => {
            cancelled = true;
        };
    }, [pathname]);

    if (!sub || HIDDEN_PATHS.includes(pathname || '')) return null;

    const expired = sub.status === 'expired';
    const remaining = sub.is_trial ? daysLeft(sub.trial_ends_at) : null;
    const showTrialWarning = remaining !== null && remaining <= WARN_WITHIN_DAYS;

    // ダッシュボードには、体験終了の案内が専用に表示されるため、ここでは重ねて出さない
    if (expired && pathname === '/dashboard') return null;
    if (!expired && !showTrialWarning) return null;

    return (
        <div className="fixed top-20 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {expired ? (
                    <div className="mb-2 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-lg">
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800">
                                    7日間の無料体験が終了しました
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                    レッスン・AIコーチング・音声認識などをご利用いただくには、プランをお選びください。過去の記事やフィードバックは、これまでどおり見返せます。
                                </p>
                                <Link
                                    href="/plans"
                                    className="inline-block mt-2 text-sm font-bold text-red-800 hover:text-red-900 underline"
                                >
                                    プランを選ぶ →
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-2 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg shadow-lg">
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-orange-800">
                                    {remaining === 0 ? '無料体験は本日で終了します' : `無料体験は、あと${remaining}日です`}
                                </p>
                                <p className="text-sm text-orange-700 mt-1">
                                    体験が終わると、レッスン・AIコーチング・音声認識などはプランの契約が必要になります。
                                </p>
                                <Link
                                    href="/plans"
                                    className="inline-block mt-2 text-sm font-bold text-orange-800 hover:text-orange-900 underline"
                                >
                                    プランを見る →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
