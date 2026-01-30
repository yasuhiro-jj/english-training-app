from fastapi import Request, HTTPException, Depends
from app.services.auth_service import AuthService
import os

auth_service = AuthService()

async def get_current_user(request: Request):
    # Cookieのデバッグ情報
    all_cookies = request.cookies
    print(f"[Auth] All cookies received: {list(all_cookies.keys())}", flush=True)
    print(f"[Auth] Request origin: {request.headers.get('origin')}", flush=True)
    print(f"[Auth] Request referer: {request.headers.get('referer')}", flush=True)
    
    token = request.cookies.get("access_token")
    
    # Authorizationヘッダーの確認（Cookieがない場合のフォールバック）
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            print(f"[Auth] Token found in Authorization header: {token[:20]}...", flush=True)
    
    if not token:
        print("[Auth] No access_token cookie or Bearer token found", flush=True)
        # 認証されていない場合はNoneを返すか、エラーを投げる
        # ここでは後続の処理で制御できるようにNoneを許容するパターンもあるが、
        # 保護ルートが前提ならHTTPExceptionを投げる
        raise HTTPException(status_code=401, detail="Authentication required")
    
    print(f"[Auth] Token found: {token[:20]}...", flush=True)
    
    try:
        # トークンをデコードしてペイロードを取得
        # AuthServiceにデコード機能を追加するか、ここで直接jwtを使う
        import jwt
        payload = jwt.decode(token, auth_service.secret_key, algorithms=[auth_service.algorithm])
        email: str = payload.get("sub")
        if email is None:
            print("[Auth] Token payload missing 'sub' field", flush=True)
            raise HTTPException(status_code=401, detail="Invalid token")
        print(f"[Auth] Authenticated user: {email}", flush=True)
        return {"email": email}
    except jwt.PyJWTError as e:
        print(f"[Auth] Token decode error: {str(e)}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
