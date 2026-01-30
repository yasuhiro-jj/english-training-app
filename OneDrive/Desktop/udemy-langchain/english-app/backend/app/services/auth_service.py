import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()

class AuthService:
    """Notionベースの認証サービス"""
    
    def __init__(self):
        self.client = Client(auth=os.getenv("NOTION_TOKEN"))
        self.user_db_id = os.getenv("NOTION_USER_DATABASE_ID")
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.algorithm = "HS256"
        self.access_token_expire_days = 7

    def hash_password(self, password: str) -> str:
        """パスワードをハッシュ化"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """パスワードの検証"""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def create_access_token(self, data: dict) -> str:
        """JWTアクセストークンの作成"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.access_token_expire_days)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """メールアドレスでユーザーを検索"""
        try:
            response = self.client.databases.query(
                database_id=self.user_db_id,
                filter={
                    "property": "Email",
                    "rich_text": {
                        "equals": email
                    }
                }
            ).get("results", [])
            
            if not response:
                return None
            
            page = response[0]
            props = page["properties"]
            
            return {
                "id": page["id"],
                "email": props["Email"]["rich_text"][0]["text"]["content"],
                "hashed_password": props["Password"]["rich_text"][0]["text"]["content"]
            }
        except Exception as e:
            print(f"Error fetching user: {e}")
            return None

    async def create_user(self, email: str, password: str) -> str:
        """新規ユーザーをNotionに作成"""
        hashed_password = self.hash_password(password)
        try:
            response = self.client.pages.create(
                parent={"database_id": self.user_db_id},
                properties={
                    "Name": { # タイトルプロパティ
                        "title": [{"text": {"content": email}}]
                    },
                    "Email": {
                        "rich_text": [{"text": {"content": email}}]
                    },
                    "Password": {
                        "rich_text": [{"text": {"content": hashed_password}}]
                    },
                    "CreatedAt": {
                        "date": {"start": datetime.now().isoformat()}
                    }
                }
            )
            return response["id"]
        except Exception as e:
            print(f"Error creating user: {e}")
            raise
