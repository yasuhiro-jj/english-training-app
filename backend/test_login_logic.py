import asyncio
import os
from app.services.auth_service import AuthService
from dotenv import load_dotenv

load_dotenv()

async def test_login_logic():
    service = AuthService()
    email = "test@example.com"
    password = "password123"
    
    print(f"Attempting to find user: {email}")
    try:
        user = await service.get_user_by_email(email)
        if user:
            print(f"User found: {user['email']}")
            print(f"Stored hashed password: {user['hashed_password']}")
            
            is_valid = service.verify_password(password, user['hashed_password'])
            print(f"Password verification: {'SUCCESS' if is_valid else 'FAILED'}")
        else:
            print("User NOT found")
    except Exception as e:
        print(f"FAILED with error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_login_logic())
