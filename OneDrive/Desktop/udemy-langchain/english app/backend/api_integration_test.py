import httpx
import asyncio
import json

BASE_URL = "http://127.0.0.1:8000/api"
TEST_EMAIL = "test_user_antigravity@example.com"
TEST_PASSWORD = "testpassword123"

async def run_test():
    async with httpx.AsyncClient(base_url=BASE_URL, follow_redirects=True, timeout=60.0) as client:
        # 1. Signup (ignore if already exists)
        print("\n--- Testing Signup ---")
        try:
            resp = await client.post("/auth/signup", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
            print(f"Signup Status: {resp.status_code}, Body: {resp.text}")
        except Exception as e:
            print(f"Signup error: {e}")

        # 2. Login
        print("\n--- Testing Login ---")
        resp = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        print(f"Login Status: {resp.status_code}")
        if resp.status_code != 200:
            print("Login failed, aborting test.")
            return
        
        # 3. Start Session
        print("\n--- Testing Session Start ---")
        session_data = {
            "topic": "Technology and AI",
            "custom_content": "Artificial Intelligence is transforming the world.",
            "custom_title": "AI Transformation",
            "custom_question": "How do you think AI will change our daily lives?"
        }
        resp = await client.post("/session/start", json=session_data)
        print(f"Session Start Status: {resp.status_code}")
        session_json = resp.json()
        session_id = session_json.get("session_id")
        print(f"Session ID: {session_id}")

        # 4. Submit Transcript (This performs analysis and Notion logging)
        print("\n--- Testing Transcript Submission (Analyze & Notion Log) ---")
        transcript_data = {
            "session_id": session_id,
            "transcript": "AI is very good for human. It help us to work faster but I think it is dangerous sometimes because it can steal our job.",
            "duration_seconds": 30
        }
        # Note: In the implemented code, it's /api/session/submit
        resp = await client.post("/session/submit", json=transcript_data)
        print(f"Submit Status: {resp.status_code}")
        if resp.status_code == 200:
            analysis_json = resp.json()
            print(f"Feedback Count: {analysis_json.get('feedback_count')}")
            for item in analysis_json.get('feedback_items', []):
                print(f"- Corrected: {item.get('corrected_sentence')}")
        else:
            print(f"Submit Error: {resp.text}")

        # 5. Get Recent Feedback
        print("\n--- Testing Recent Feedback Retrieval ---")
        resp = await client.get("/feedback/recent?limit=5")
        print(f"Get Feedback Status: {resp.status_code}")
        # print(f"Feedback: {resp.text}")

if __name__ == "__main__":
    asyncio.run(run_test())
