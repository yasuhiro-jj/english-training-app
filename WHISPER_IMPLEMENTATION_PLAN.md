# 🎤 Whisper API統合実装計画

## 📋 概要

現在のWeb Speech API（端末依存）から、OpenAI Whisper API（サーバー側高精度）への移行計画。

### 目標
- ✅ 無料体験（7日間）: Whisper API 20分まで
- ✅ 有料プラン: Whisper API 無制限
- ✅ 20分超過後: 端末STT（Web Speech）に自動切り替え

---

## 🏗️ 実装フェーズ

### フェーズ1: バックエンド基盤（優先度: 高）

#### 1.1 Notionデータベース拡張
**場所**: Notion Users DB

追加カラム:
- `Whisper Usage Minutes (This Month)` (Number) - 今月のWhisper使用分数
- `Whisper Usage Minutes (Total)` (Number) - 累計Whisper使用分数
- `Last Whisper Usage Date` (Date) - 最後にWhisperを使った日

#### 1.2 スキーマ追加
**ファイル**: `backend/app/models/schemas.py`

```python
class WhisperTranscribeRequest(BaseModel):
    """Whisper文字起こしリクエスト"""
    audio_data: str  # base64エンコードされた音声データ
    session_id: str
    duration_seconds: int

class WhisperTranscribeResponse(BaseModel):
    """Whisper文字起こしレスポンス"""
    transcript: str
    duration_seconds: float  # Whisperが検出した実際の音声長
    usage_minutes: float  # 今回の使用分数（課金計算用）
    remaining_minutes: Optional[float] = None  # 残り分数（無料体験の場合）
```

#### 1.3 Whisperサービス実装
**ファイル**: `backend/app/services/whisper_service.py` (新規作成)

```python
from openai import AsyncOpenAI
import os
import base64
import io
from typing import Dict, Optional

class WhisperService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key)
    
    async def transcribe_audio(
        self,
        audio_base64: str,
        user_email: str,
        is_trial: bool = False
    ) -> Dict:
        """
        音声をWhisper APIで文字起こし
        
        Returns:
            {
                "transcript": str,
                "duration_seconds": float,
                "usage_minutes": float,
                "remaining_minutes": Optional[float]
            }
        """
        # 1. base64デコード
        # 2. Whisper API呼び出し
        # 3. 使用分数計算
        # 4. 無料体験の場合は残り分数を計算
        pass
```

#### 1.4 使用量追跡サービス
**ファイル**: `backend/app/services/usage_service.py` (新規作成)

```python
from notion_client import Client
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

class UsageService:
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
    
    async def get_whisper_usage_this_month(self, email: str) -> float:
        """今月のWhisper使用分数を取得"""
        pass
    
    async def add_whisper_usage(self, email: str, minutes: float):
        """Whisper使用分数を追加"""
        pass
    
    async def can_use_whisper(self, email: str, requested_minutes: float) -> Dict:
        """
        Whisper使用可能かチェック
        
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_minutes": Optional[float]
            }
        """
        pass
```

#### 1.5 APIエンドポイント追加
**ファイル**: `backend/app/routes/whisper.py` (新規作成)

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.models.schemas import WhisperTranscribeRequest, WhisperTranscribeResponse
from app.services.whisper_service import WhisperService
from app.services.usage_service import UsageService
from app.deps import get_current_user

router = APIRouter(prefix="/api/whisper", tags=["whisper"])

whisper_service = WhisperService()
usage_service = UsageService()

@router.post("/transcribe", response_model=WhisperTranscribeResponse)
async def transcribe_audio(
    request: WhisperTranscribeRequest,
    user: dict = Depends(get_current_user)
):
    """
    音声をWhisper APIで文字起こし
    - 無料体験: 20分まで
    - 有料プラン: 無制限
    """
    user_email = user.get("email")
    
    # 1. 使用可能かチェック
    # 2. Whisper API呼び出し
    # 3. 使用量を記録
    # 4. レスポンス返却
    pass
```

---

### フェーズ2: フロントエンド実装（優先度: 高）

#### 2.1 MediaRecorder統合
**ファイル**: `frontend/components/AudioRecorder.tsx`

追加機能:
- `MediaRecorder` APIで音声録音
- 録音データをBlob → base64に変換
- Whisper APIエンドポイントに送信
- 結果を`transcript`に設定

実装ポイント:
```typescript
const [useWhisper, setUseWhisper] = useState(true); // Whisper使用フラグ
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);

const startRecordingWithWhisper = async () => {
    // 1. getUserMediaでマイク取得
    // 2. MediaRecorder初期化
    // 3. 録音開始
};

const stopRecordingWithWhisper = async () => {
    // 1. MediaRecorder停止
    // 2. Blobをbase64に変換
    // 3. Whisper API呼び出し
    // 4. 結果をtranscriptに設定
};
```

#### 2.2 APIクライアント追加
**ファイル**: `frontend/lib/api.ts`

```typescript
async transcribeWithWhisper(
    audioBase64: string,
    sessionId: string,
    durationSeconds: number
): Promise<{ transcript: string; remaining_minutes?: number }> {
    const response = await authenticatedFetch(`${API_URL}/api/whisper/transcribe`, {
        method: 'POST',
        body: JSON.stringify({
            audio_data: audioBase64,
            session_id: sessionId,
            duration_seconds: durationSeconds,
        }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '文字起こしに失敗しました');
    }
    return response.json();
}
```

#### 2.3 UI改善
**ファイル**: `frontend/components/AudioRecorder.tsx`

追加表示:
- 「Whisper高精度モード」/「端末STTモード」の切り替え表示
- 無料体験の場合: 「Whisper残り: 15分 / 20分」
- 20分超過時: 「Whisper制限に達しました。端末STTに切り替えました」

---

### フェーズ3: 使用量管理・制限チェック（優先度: 中）

#### 3.1 サブスクリプション状態の取得
**ファイル**: `backend/app/services/subscription_service.py` (新規作成 or 拡張)

```python
async def get_user_subscription_status(email: str) -> Dict:
    """
    ユーザーのサブスクリプション状態を取得
    
    Returns:
        {
            "plan": "free" | "basic" | "premium",
            "status": "trial" | "active" | "expired",
            "trial_ends_at": Optional[datetime],
            "is_trial": bool
        }
    """
    pass
```

#### 3.2 使用量チェックロジック
**ファイル**: `backend/app/services/usage_service.py`

```python
async def check_whisper_limit(
    email: str,
    requested_minutes: float
) -> Dict:
    """
    無料体験: 20分まで
    有料プラン: 無制限
    
    Returns:
        {
            "allowed": bool,
            "reason": str,
            "remaining_minutes": Optional[float],
            "should_fallback_to_stt": bool
        }
    """
    subscription = await get_user_subscription_status(email)
    
    if subscription["is_trial"]:
        # 無料体験: 20分制限
        current_usage = await self.get_whisper_usage_this_month(email)
        remaining = 20.0 - current_usage
        
        if remaining <= 0:
            return {
                "allowed": False,
                "reason": "無料体験のWhisper使用上限（20分）に達しました",
                "remaining_minutes": 0,
                "should_fallback_to_stt": True
            }
        
        if requested_minutes > remaining:
            return {
                "allowed": False,
                "reason": f"Whisper残り{remaining:.1f}分です。端末STTをご利用ください",
                "remaining_minutes": remaining,
                "should_fallback_to_stt": True
            }
        
        return {
            "allowed": True,
            "reason": "",
            "remaining_minutes": remaining - requested_minutes,
            "should_fallback_to_stt": False
        }
    else:
        # 有料プラン: 無制限
        return {
            "allowed": True,
            "reason": "",
            "remaining_minutes": None,
            "should_fallback_to_stt": False
        }
```

---

### フェーズ4: フォールバック機能（優先度: 中）

#### 4.1 自動切り替えロジック
**ファイル**: `frontend/components/AudioRecorder.tsx`

```typescript
const handleWhisperError = (error: Error) => {
    if (error.message.includes('20分') || error.message.includes('上限')) {
        // Whisper制限に達した場合、端末STTに自動切り替え
        setUseWhisper(false);
        setStatusMsg('Whisper制限に達しました。端末STTモードに切り替えました');
        // 端末STTで再録音開始
        startRecordingWithDeviceSTT();
    }
};
```

---

## 📝 実装順序（推奨）

### Day 1: バックエンド基盤
1. ✅ `WhisperService` 実装
2. ✅ `UsageService` 実装
3. ✅ `/api/whisper/transcribe` エンドポイント作成
4. ✅ Notion DBに使用量カラム追加

### Day 2: フロントエンド統合
1. ✅ `MediaRecorder` API統合
2. ✅ Whisper API呼び出し機能
3. ✅ 録音→アップロード→文字起こしフロー

### Day 3: 使用量管理・UI
1. ✅ 無料体験の20分制限チェック
2. ✅ 残り分数表示
3. ✅ 自動フォールバック機能
4. ✅ エラーハンドリング

### Day 4: テスト・調整
1. ✅ エンドツーエンドテスト
2. ✅ エラーケースのテスト
3. ✅ パフォーマンス調整

---

## 🔧 技術的な詳細

### Whisper API呼び出し
```python
# backend/app/services/whisper_service.py
audio_bytes = base64.b64decode(audio_base64)
audio_file = io.BytesIO(audio_bytes)
audio_file.name = "recording.webm"  # または .m4a, .mp3

response = await self.client.audio.transcriptions.create(
    model="whisper-1",
    file=audio_file,
    language="en"  # 英語に固定
)

transcript = response.text
duration_seconds = response.duration  # Whisperが検出した長さ
usage_minutes = duration_seconds / 60.0
```

### MediaRecorder実装
```typescript
// frontend/components/AudioRecorder.tsx
const startMediaRecorder = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
    
    const recorder = new MediaRecorder(stream, { mimeType });
    audioChunksRef.current = [];
    
    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
        }
    };
    
    recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const base64 = await blobToBase64(blob);
        // Whisper API呼び出し
    };
    
    recorder.start();
    mediaRecorderRef.current = recorder;
};
```

---

## 📊 コスト試算

### 無料体験（1人あたり）
- **20分** × **$0.006/分** = **$0.12/人**（約18円/人）

### 有料プラン（標準ユーザー）
- **月200分** × **$0.006/分** = **$1.2/月**（約180円/月）
- **月600分** × **$0.006/分** = **$3.6/月**（約540円/月）

### マージン
- Basic ¥2,980/月 - 180円（Whisper） = **約2,800円のマージン**
- Premium ¥4,980/月 - 540円（Whisper） = **約4,440円のマージン**

---

## ⚠️ 注意事項

1. **音声フォーマット**: WebM/MP4/M4A対応が必要
2. **ファイルサイズ**: base64エンコードで約33%増加 → アップロード時間に注意
3. **タイムアウト**: 長い録音（5分以上）はタイムアウト設定が必要
4. **エラーハンドリング**: Whisper API失敗時は端末STTにフォールバック
5. **使用量リセット**: 無料体験は「今月」ではなく「体験期間中」で20分

---

## 🎯 成功基準

- ✅ 無料体験でWhisper APIが20分まで使える
- ✅ 20分超過で自動的に端末STTに切り替わる
- ✅ 有料プランでWhisper APIが無制限で使える
- ✅ 使用量がNotionに正確に記録される
- ✅ エラー時に適切なフォールバックが動作する

---

**作成日**: 2026年1月30日  
**最終更新**: 2026年2月3日

---

## ✅ 実装完了状況（2026年2月3日）

### バックエンド実装
- ✅ WhisperService実装完了
- ✅ UsageService実装完了
- ✅ APIルート (`/api/whisper/transcribe`) 実装完了
- ✅ エラーハンドリング実装完了

### フロントエンド実装
- ✅ MediaRecorder API統合完了
- ✅ Whisper API呼び出し機能実装完了
- ✅ 使用量表示とフォールバック機能実装完了

### データベース設定
- ✅ Notion Users DBにプロパティ追加完了
  - `Whisper Usage Minutes (This Month)` (Number)
  - `Whisper Usage Minutes (Total)` (Number)
  - `Last Whisper Usage Date` (Date)
  - `Subscription Plan` (Select)
  - `Subscription Status` (Select)
  - `Trial Ends At` (Date)

### テスト・確認ツール
- ✅ 環境変数確認スクリプト (`check_env.py`)
- ✅ Notionプロパティ確認スクリプト (`check_whisper_properties.py`)
- ✅ Whisper APIテストスクリプト (`test_whisper_api.py`)

**実装ステータス**: 🎉 **完了**
