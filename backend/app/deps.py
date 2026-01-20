from fastapi import Request, HTTPException, Depends
from app.services.auth_service import AuthService
import os

auth_service = AuthService()

async def get_current_user(request: Request):
    # Authorizationヘッダーを確認
    auth_header = request.headers.get("Authorization")
    token = None
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # フォールバック: クッキーを確認
    if not token:
        token = request.cookies.get("access_token")
        
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # トークンをデコードしてペイロードを取得
        # AuthServiceにデコード機能を追加するか、ここで直接jwtを使う
        import jwt
        payload = jwt.decode(token, auth_service.secret_key, algorithms=[auth_service.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"email": email}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
