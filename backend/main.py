from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables FIRST
load_dotenv()

from app.routes import session_router, auth_router, chat_router, dashboard_router, lesson_router, tts_router, stripe_webhook_router, feedback_router
from app.routes import whisper as whisper_router


app = FastAPI(
    title="English Conversation Training API",
    description="API for RareJob DNA article-based conversation training",
    version="1.0.0"
)

# CORS設定（フロントエンドからのアクセスを許可）
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
# credentialsがTrueの場合、originsに "*" は指定できないため、明示的に指定するか、
# 全て許可したい場合は "*" を展開する必要があるが、通常はフロントURLを指定する。
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in allowed_origins if o != "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(session_router)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(dashboard_router)
app.include_router(lesson_router)
app.include_router(tts_router)
app.include_router(stripe_webhook_router)
app.include_router(feedback_router)
app.include_router(whisper_router.router)

@app.get("/")
async def root():
    """ヘルスチェック用エンドポイント"""
    return {
        "status": "ok",
        "message": "English Conversation Training API is running"
    }

@app.get("/health")
async def health_check():
    """詳細なヘルスチェック"""
    return {
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "notion_token_configured": bool(os.getenv("NOTION_TOKEN")),
        "notion_user_db_configured": bool(os.getenv("NOTION_USER_DATABASE_ID")),
        "notion_user_db_id_value": os.getenv("NOTION_USER_DATABASE_ID", "NOT_SET")[:20] + "..." if os.getenv("NOTION_USER_DATABASE_ID") else "NOT_SET",
        "notion_user_email_property": os.getenv("NOTION_USER_EMAIL_PROPERTY", "Email"),
        "notion_subscription_plan_property": os.getenv("NOTION_SUBSCRIPTION_PLAN_PROPERTY", "Subscription Plan"),
        "notion_subscription_status_property": os.getenv("NOTION_SUBSCRIPTION_STATUS_PROPERTY", "Subscription Status"),
        "notion_db_conversation_id": bool(os.getenv("NOTION_CONVERSATION_DB_ID")),
        "notion_db_feedback_id": bool(os.getenv("NOTION_FEEDBACK_DB_ID")),
        "notion_db_lessons_id": bool(os.getenv("NOTION_LESSONS_DB_ID")),
        "notion_db_lessons_id_value": os.getenv("NOTION_LESSONS_DB_ID", "NOT_SET")[:20] + "..." if os.getenv("NOTION_LESSONS_DB_ID") else "NOT_SET",
        "stripe_secret_configured": bool(os.getenv("STRIPE_SECRET_KEY")),
        "stripe_webhook_secret_configured": bool(os.getenv("STRIPE_WEBHOOK_SECRET")),
    }

if __name__ == "__main__":
    import uvicorn
    import logging
    
    # ロギング設定を明示的に設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    port = int(os.getenv("PORT", 8000))
    # reload=Trueの場合、ロギング設定の問題を回避するためlog_configを明示的に設定
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_config=None  # デフォルトのロギング設定を使用しない
    )

