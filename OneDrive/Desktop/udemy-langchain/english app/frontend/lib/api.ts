// 環境変数からAPI URLを取得（デプロイ環境対応）
// 開発環境: 空文字（next.config.tsのrewritesを使用）
// 本番環境: RailwayのURL（例: https://your-app.up.railway.app）
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// 401エラー時の処理（認証エラー）
const handleAuthError = (url: string) => {
    console.error('[API] 401 Unauthorized error for:', url);
    console.error('[API] Clearing auth state and redirecting to login');
    if (typeof window !== 'undefined') {
        // ローカルストレージをクリア
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        // ログインページにリダイレクト
        window.location.href = '/login';
    }
};

// Cookieの状態を確認する関数
const checkCookies = () => {
    if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);
        console.log('[API] Current cookies:', cookies);
        console.log('[API] access_token cookie exists:', 'access_token' in cookies);
        return cookies;
    }
    return {};
};

// 認証付きfetchのラッパー
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    console.log('[API] Making authenticated request to:', url);
    console.log('[API] API_URL:', API_URL);
    console.log('[API] Full URL:', url);
    
    // Cookieの状態を確認
    checkCookies();
    
    // localStorageからトークンを取得
    let token = null;
    if (typeof window !== 'undefined') {
        token = localStorage.getItem('auth_token');
        console.log('[API] Found auth_token in localStorage:', !!token);
    }
    
    const headers = {
        ...options.headers,
        // トークンがあればAuthorizationヘッダーに追加
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    
    const response = await fetch(url, {
        ...options,
        headers, // 更新されたヘッダーを使用
        credentials: 'include',
    });
    
    console.log('[API] Response status:', response.status, 'for:', url);
    console.log('[API] Response headers:', {
        'set-cookie': response.headers.get('set-cookie'),
        'content-type': response.headers.get('content-type'),
    });
    
    // レスポンス後にCookieを再確認
    if (response.status === 200 || response.status === 201) {
        setTimeout(() => {
            console.log('[API] Cookies after successful response:');
            checkCookies();
        }, 100);
    }
    
    if (response.status === 401) {
        console.error('[API] 401 Unauthorized - Cookie may not be sent correctly');
        handleAuthError(url);
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
        const response = await authenticatedFetch(`${API_URL}/lesson/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
