import asyncio
import os
from app.services.auth_service import AuthService
from dotenv import load_dotenv

load_dotenv()

async def test_create_user():
    service = AuthService()
    email = "test@example.com"
    password = "password123"
    
    print(f"Attempting to create user: {email}")
    try:
        user_id = await service.create_user(email, password)
        print(f"Success! User ID: {user_id}")
    except Exception as e:
        print(f"FAILED with error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_user())
