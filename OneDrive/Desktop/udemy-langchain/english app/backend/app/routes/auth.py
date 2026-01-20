from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel, EmailStr
from app.services.auth_service import AuthService
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_service = AuthService()

# 環境変数からCookie設定を取得（本番環境ではsecure=True、開発環境ではsecure=False）
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true" or IS_PRODUCTION
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"  # クロスオリジンの場合はnoneが必要

class UserAuth(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
async def signup(user_data: UserAuth):
    # すでにユーザーが存在するか確認
    existing_user = await auth_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    
    try:
        user_id = await auth_service.create_user(user_data.email, user_data.password)
        return {"message": "ユーザー登録が完了しました", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(user_data: UserAuth, response: Response):
    user = await auth_service.get_user_by_email(user_data.email)
    if not user or not auth_service.verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    
    token = auth_service.create_access_token({"sub": user["email"]})
    
    # httpOnly Cookieに保存
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60, # 7日間
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE
    )
    
    return {"message": "ログインに成功しました", "email": user["email"]}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE
    )
    return {"message": "ログアウトしました"}
