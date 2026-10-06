'use client';

import { useEffect, useState } from 'react';

export const GENERATION_TIME_KEY = 'ds_lesson_gen_seconds';

const DEFAULT_SECONDS = 30;

function loadExpectedSeconds(): number {
    try {
        const saved = Number(localStorage.getItem(GENERATION_TIME_KEY));
        if (Number.isFinite(saved) && saved >= 10 && saved <= 90) return saved;
    } catch {
        // localStorageが使えない環境では既定値を使う
    }
    return DEFAULT_SECONDS;
}

export function saveGenerationSeconds(seconds: number) {
    try {
        const clamped = Math.min(90, Math.max(10, seconds));
        const prev = Number(localStorage.getItem(GENERATION_TIME_KEY));
        const next = Number.isFinite(prev) && prev >= 10 ? Math.round((prev + clamped) / 2) : Math.round(clamped);
        localStorage.setItem(GENERATION_TIME_KEY, String(next));
    } catch {
        // 保存できなくても動作に影響しない
    }
}

export default function GenerationProgress() {
    const [elapsed, setElapsed] = useState(0);
    const [expected] = useState(loadExpectedSeconds);

    useEffect(() => {
        const startedAt = Date.now();
        const timer = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250);
        return () => clearInterval(timer);
    }, []);

    // 実際の完了時刻は分からないため、予想時間に近づくほど伸びが緩やかになる推定値(95%を超えない)
    const percent = Math.min(95, 95 * (1 - Math.exp(-elapsed / (expected / 2))));
    const remaining = Math.max(0, Math.round(expected - elapsed));

    const stage =
        elapsed < 6 ? 'ニュース記事を取得しています…' :
        elapsed < expected * 0.9 ? 'AIが英語レッスンを作成しています…' :
        '仕上げています…';

    return (
        <div className="w-full max-w-md mx-auto mt-6 text-left" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
            <div className="flex justify-between text-sm text-gray-700 mb-2">
                <span>{stage}</span>
                <span className="font-semibold">{Math.round(percent)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <p className="text-xs text-gray-500 mt-2">
                {remaining > 0
                    ? `あと約${remaining}秒(目安です)`
                    : '予想より少し時間がかかっています。もう少しお待ちください'}
            </p>
        </div>
    );
}
