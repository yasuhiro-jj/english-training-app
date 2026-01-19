// 末尾の記号を除去して正規化
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

if (typeof window !== 'undefined') {
    console.log('--- [BUILD ATTEMPT: #7] API_URL Debug Info ---');
    console.log('Raw process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('Final API_URL used:', API_URL);
    if (!API_URL) {
        console.error('CRITICAL: NEXT_PUBLIC_API_URL is missing in this build!');
    }
    console.log('--------------------------------------------');
}

export interface SessionResponse {
    session_id: string;
    question: string;
    article_summary: string;
}

export interface AnalysisResponse {
    session_id: string;
    feedback_count: number;
    feedback_items?: Array<{
        original_sentence: string;
        corrected_sentence: string;
        category: string;
        reason: string;
    }>;
    message: string;
}

export interface FeedbackItem {
    original_sentence: string;
    corrected_sentence: string;
    category: string;
    reason: string;
    status: string;
}

export interface VocabularyItem {
    word: string;
    pronunciation: string;
    type: string;
    definition: string;
    example: string;
}

export interface LessonOption {
    title: string;
    date: string;
    category: string;
    vocabulary: VocabularyItem[];
    content: string;
    discussion_a: string[];
    discussion_b: string[];
    question: string;
    level: string;
    japanese_title: string;
}

export interface LessonGenerateResponse {
    lessons: LessonOption[];
}

const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    console.log('[API] getAuthHeaders - Token present:', !!token);
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
};

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
        credentials: 'include',
    });
};

export const api = {
    async generateLessons(): Promise<LessonGenerateResponse> {
        const response = await authenticatedFetch(`${API_URL}/api/session/generate`, {
            method: 'GET',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'レッスンの生成に失敗しました');
        }
        return response.json();
    },

    async startSession(
        articleUrl?: string,
        customContent?: { title: string; content: string; question: string }
    ): Promise<SessionResponse> {
        const body: any = {};

        if (customContent) {
            body.custom_title = customContent.title;
            body.custom_content = customContent.content;
            body.custom_question = customContent.question;
        } else if (articleUrl) {
            body.article_url = articleUrl;
        } else {
            throw new Error("URLまたはコンテンツが必要です");
        }

        const response = await authenticatedFetch(`${API_URL}/api/session/start`, {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'セッションの開始に失敗しました');
        }

        return response.json();
    },

    async submitTranscript(
        sessionId: string,
        transcript: string,
        durationSeconds: number
    ): Promise<AnalysisResponse> {
        const response = await authenticatedFetch(`${API_URL}/api/session/submit`, {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                transcript,
                duration_seconds: durationSeconds,
            }),
        });

        if (!response.ok) {
            throw new Error('解析の送信に失敗しました');
        }

        return response.json();
    },

    async getRecentFeedback(limit: number = 10): Promise<FeedbackItem[]> {
        const response = await authenticatedFetch(`${API_URL}/api/feedback/recent?limit=${limit}`);

        if (!response.ok) {
            throw new Error('フィードバックの取得に失敗しました');
        }

        const data = await response.json();
        return data.feedback;
    },

    async getDashboardStats(): Promise<any> {
        const response = await authenticatedFetch(`${API_URL}/api/dashboard/stats`);
        if (!response.ok) {
            throw new Error('統計情報の取得に失敗しました');
        }
        return response.json();
    },

    async sendMessage(message: string, history: any[]): Promise<{ response: string }> {
        const response = await authenticatedFetch(`${API_URL}/api/chat`, {
            method: 'POST',
            body: JSON.stringify({ message, history }),
        });
        if (!response.ok) {
            throw new Error('メッセージの送信に失敗しました');
        }
        return response.json();
    },
};
