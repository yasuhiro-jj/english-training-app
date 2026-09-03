'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

interface UsageInfo {
    daily_lessons: number;
    daily_ai_messages: number;
    remaining_lessons: number;
    remaining_ai_messages: number;
}

export default function UsageLimitBanner() {
    const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                const stats = await api.getDashboardStats();
                if (stats.subscription?.is_trial && stats.usage) {
                    setUsageInfo(stats.usage);
                }
            } catch (error) {
                console.error('Failed to fetch usage info:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsage();
    }, []);

    if (isLoading || !usageInfo) {
        return null;
    }

    // 警告を表示する条件: 残りが少ない場合（レッスン: 残り0、AIコーチング: 残り3以下）
    const shouldShowLessonWarning = usageInfo.remaining_lessons === 0;
    const shouldShowAIChatWarning = usageInfo.remaining_ai_messages <= 3 && usageInfo.remaining_ai_messages > 0;
    const shouldShowAIChatLimit = usageInfo.remaining_ai_messages === 0;

    if (!shouldShowLessonWarning && !shouldShowAIChatWarning && !shouldShowAIChatLimit) {
        return null;
    }

    return (
        <div className="fixed top-20 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {shouldShowLessonWarning && (
                    <div className="mb-2 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-lg">
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-yellow-800">
                                    本日のレッスン制限に達しました
                                </p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    無料体験では1日1レッスンまでです。明日またお試しください。
                                </p>
                                <Link
                                    href="/plans"
                                    className="inline-block mt-2 text-sm font-bold text-yellow-800 hover:text-yellow-900 underline"
                                >
                                    有料プランで無制限に利用する →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {shouldShowAIChatLimit && (
                    <div className="mb-2 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-lg">
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800">
                                    本日のAIコーチング制限に達しました
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                    無料体験では1日10メッセージまでです。明日またお試しください。
                                </p>
                                <Link
                                    href="/plans"
                                    className="inline-block mt-2 text-sm font-bold text-red-800 hover:text-red-900 underline"
                                >
                                    有料プランで無制限に利用する →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {shouldShowAIChatWarning && (
                    <div className="mb-2 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg shadow-lg">
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-orange-800">
                                    AIコーチングの残りメッセージが少なくなっています
                                </p>
                                <p className="text-sm text-orange-700 mt-1">
                                    残り {usageInfo.remaining_ai_messages} メッセージ（無料体験: 1日10メッセージまで）
                                </p>
                                <Link
                                    href="/plans"
                                    className="inline-block mt-2 text-sm font-bold text-orange-800 hover:text-orange-900 underline"
                                >
                                    有料プランで無制限に利用する →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
