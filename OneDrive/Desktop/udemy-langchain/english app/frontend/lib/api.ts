// 環境変数からAPI URLを取得（デプロイ環境対応）
// 開発環境: 空文字（next.config.tsのrewritesを使用）
// 本番環境: RailwayのURL（例: https://your-app.up.railway.app）
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 401エラー時の処理（認証エラー）
const handleAuthError = () => {
    if (typeof window !== 'undefined') {
        // ローカルストレージをクリア
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        // ログインページにリダイレクト
        window.location.href = '/login';
    }
};

// 認証付きfetchのラッパー
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
    });
    
    if (response.status === 401) {
        handleAuthError();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '認証が必要です。ログインしてください。');
    }
    
    return response;
};

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

    async generateLessonFromUrl(newsUrl: string): Promise<LessonGenerateResponse> {
        const response = await fetch(`${API_URL}/lesson/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ news_url: newsUrl }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'レッスンの生成に失敗しました');
        }
        return response.json();
    },

    async generateLessonAuto(): Promise<LessonGenerateResponse> {
        const response = await authenticatedFetch(`${API_URL}/lesson/generate/auto`, {
            method: 'GET',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'レッスンの自動生成に失敗しました');
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
            // article_url is optional now
        } else if (articleUrl) {
            body.article_url = articleUrl;
        } else {
            throw new Error("URLまたはコンテンツが必要です");
        }

        const response = await authenticatedFetch(`${API_URL}/api/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${API_URL}/api/session/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history }),
        });
        if (!response.ok) {
            throw new Error('メッセージの送信に失敗しました');
        }
        return response.json();
    },
};
