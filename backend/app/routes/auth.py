from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel, EmailStr
from app.services.auth_service import AuthService
from app.services.rate_limiter import rate_limiter
from collections import defaultdict
import asyncio
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_service = AuthService()

# Notionには一意制約がなく「重複チェック→作成」がアトミックでないため、
# 同一メールアドレスの同時サインアップをプロセス内で直列化する。
_signup_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

class UserAuth(BaseModel):
    email: EmailStr
    password: str

def _client_key(request: Request, email: str) -> str:
    ip = request.client.host if request.client else "unknown"
    return f"{ip}:{email.lower()}"


@router.post("/signup")
async def signup(user_data: UserAuth, request: Request):
    if not rate_limiter.is_allowed(f"signup:{_client_key(request, user_data.email)}", max_attempts=5, window_seconds=3600):
        raise HTTPException(status_code=429, detail="試行回数が多すぎます。しばらくしてから再度お試しください。")

    email_key = user_data.email.lower()
    async with _signup_locks[email_key]:
        # すでにユーザーが存在するか確認
        existing_user = await auth_service.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

        try:
            user_id = await auth_service.create_user(user_data.email, user_data.password)
            return {"message": "ユーザー登録が完了しました", "user_id": user_id}
        except Exception as e:
            logger.error(f"Signup failed for {user_data.email}: {e}")
            raise HTTPException(status_code=500, detail="ユーザー登録に失敗しました。しばらくしてから再度お試しください。")

@router.post("/login")
async def login(user_data: UserAuth, response: Response, request: Request):
    if not rate_limiter.is_allowed(f"login:{_client_key(request, user_data.email)}", max_attempts=10, window_seconds=600):
        raise HTTPException(status_code=429, detail="試行回数が多すぎます。しばらくしてから再度お試しください。")

    try:
        user = await auth_service.get_user_by_email(user_data.email)
    except Exception as e:
        logger.error(f"Login lookup failed for {user_data.email}: {e}")
        raise HTTPException(status_code=500, detail="ログインに失敗しました。しばらくしてから再度お試しください。")

    if not user or not auth_service.verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

    token = auth_service.create_access_token({"sub": user["email"]})

    cookie_secure = os.getenv("COOKIE_SECURE", "true").lower() == "true"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=cookie_secure,
        samesite="none" if cookie_secure else "lax",
        max_age=auth_service.access_token_expire_days * 24 * 60 * 60,
    )

    return {
        "message": "ログインに成功しました",
        "email": user["email"],
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "ログアウトしました"}
