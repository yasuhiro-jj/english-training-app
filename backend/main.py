from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables FIRST
load_dotenv()

from app.routes import session_router, auth_router, chat_router, dashboard_router


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
        "notion_configured": bool(os.getenv("NOTION_TOKEN"))
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

