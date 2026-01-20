from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel, EmailStr
from app.services.auth_service import AuthService
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_service = AuthService()

# 環境変数からCookie設定を取得（本番環境ではsecure=True、開発環境ではsecure=False）
# RailwayのURLが含まれている場合は本番環境とみなす
RAILWAY_ENVIRONMENT = os.getenv("RAILWAY_ENVIRONMENT")
IS_PRODUCTION = (
    os.getenv("ENVIRONMENT", "development") == "production" or 
    RAILWAY_ENVIRONMENT is not None or
    os.getenv("RAILWAY_SERVICE_NAME") is not None
)

# クロスオリジンの場合は常にSecure=True、SameSite=Noneが必要
# Railwayにデプロイされている場合は常にHTTPSなのでSecure=True
COOKIE_SECURE = (
    os.getenv("COOKIE_SECURE", "false").lower() == "true" or 
    IS_PRODUCTION or
    RAILWAY_ENVIRONMENT is not None
)
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"  # クロスオリジンの場合はnoneが必要

# デバッグ用：環境変数の状態を出力
print(f"[Auth] Environment check - IS_PRODUCTION: {IS_PRODUCTION}, COOKIE_SECURE: {COOKIE_SECURE}, COOKIE_SAMESITE: {COOKIE_SAMESITE}", flush=True)
print(f"[Auth] RAILWAY_ENVIRONMENT: {RAILWAY_ENVIRONMENT}, ENVIRONMENT: {os.getenv('ENVIRONMENT', 'not set')}", flush=True)

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
    
    # Cookie設定のデバッグ情報
    print(f"[Auth] Cookie settings - Secure: {COOKIE_SECURE}, SameSite: {COOKIE_SAMESITE}", flush=True)
    print(f"[Auth] Setting cookie for user: {user['email']}", flush=True)
    print(f"[Auth] Token length: {len(token)}", flush=True)
    
    # httpOnly Cookieに保存
    # クロスオリジンの場合、domainは設定しない（ブラウザが自動的に設定）
    # path="/" を明示的に設定して、すべてのパスでCookieが有効になるようにする
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60, # 7日間
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",  # 明示的にパスを設定
        # domainは設定しない（クロスオリジンの場合、ブラウザが自動的に設定）
    )
    
    # レスポンスヘッダーを確認
    cookie_header = response.headers.get("set-cookie", "NOT SET")
    print(f"[Auth] Set-Cookie header: {cookie_header}", flush=True)
    print(f"[Auth] Cookie set successfully", flush=True)
    
    # Cookie認証だけでなく、Bearer認証もサポートするためにトークンを返す
    return {
        "message": "ログインに成功しました", 
        "email": user["email"],
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE
    )
    return {"message": "ログアウトしました"}
