import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_full_flow():
    print("1. Generating Lessons...")
    try:
        resp = requests.get(f"{BASE_URL}/api/session/generate")
        if resp.status_code != 200:
            print(f"Generate Failed: {resp.text}")
            return
        lessons = resp.json()["lessons"]
        target_lesson = lessons[0]
        print(f"Generated Lesson: {target_lesson['title']}")
        
        print("\n2. Starting Session...")
        payload = {
            "custom_content": target_lesson["content"],
            "custom_title": target_lesson["title"],
            "custom_question": target_lesson["question"],
            "custom_lesson_data": target_lesson
        }
        start_resp = requests.post(f"{BASE_URL}/api/session/start", json=payload)
        if start_resp.status_code != 200:
            print(f"Start Failed: {start_resp.text}")
            return
            
        session_data = start_resp.json()
        session_id = session_data["session_id"]
        print(f"Session Started. ID: {session_id}")
        
        print("\n3. Submitting Transcript...")
        # Simulate a short delay
        time.sleep(1)
        submit_payload = {
            "session_id": session_id,
            "transcript": "I think the video is very shocking. It is bad to film violence.",
            "duration_seconds": 10
        }
        submit_resp = requests.post(f"{BASE_URL}/api/session/submit", json=submit_payload)
        
        if submit_resp.status_code == 200:
            result = submit_resp.json()
            print(f"Submission Success! Messages: {result['message']}")
            print(f"Feedback Count: {result['feedback_count']}")
        else:
            print(f"Submission Failed: {submit_resp.status_code} - {submit_resp.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_full_flow()
