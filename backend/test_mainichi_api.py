import requests
import json
import time

BASE_URL = "http://localhost:8000"



def test_generate_and_json_structure():
    print("1. Testing Generate Lessons (RareJob Style)...")
    start_time = time.time()
    try:
        response = requests.get(f"{BASE_URL}/api/session/generate")
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text}")
            return
        
        data = response.json()
        lessons = data.get("lessons", [])
        print(f"Generated {len(lessons)} lessons in {time.time() - start_time:.2f}s")
        
        if not lessons:
            print("No lessons generated.")
            return

        lesson = lessons[0]
        print(f"\n[Lesson A: {lesson.get('title')}]")
        print(f"Date: {lesson.get('date')}")
        print(f"Category: {lesson.get('category')}")
        
        vocab = lesson.get('vocabulary', [])
        print(f"Vocabulary ({len(vocab)} items):")
        if vocab:
            v = vocab[0]
            print(f" - {v.get('word')} {v.get('type')}: {v.get('definition')}")
        
        print(f"\nDiscussions:")
        print(f" A: {lesson.get('discussion_a')}")
        print(f" B: {lesson.get('discussion_b')}")

        # 2. Start Session
        print("\n2. Testing Start Session with Lesson Data...")
        payload = {
            "custom_title": lesson['title'],
            "custom_content": lesson['content'],
            "custom_question": lesson['question'], 
            "custom_lesson_data": lesson # Sending full structure
        }
        
        res_start = requests.post(f"{BASE_URL}/api/session/start", json=payload)
        if res_start.status_code == 200:
            print(f"Session Started! ID: {res_start.json()['session_id']}")
        else:
            print(f"Start Error: {res_start.text}")

    except Exception as e:
        print(f"Test Failed: {e}")

if __name__ == "__main__":
    test_generate_and_json_structure()
