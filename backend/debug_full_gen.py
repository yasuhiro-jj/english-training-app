import asyncio
import os
from dotenv import load_dotenv
from app.services.news_service import NewsService
from app.services.ai_service import AIService
import json

async def debug_full_flow():
    load_dotenv()
    
    news_service = NewsService()
    ai_service = AIService()
    
    print("=== STEP 1: Scrape News ===")
    news_data = await news_service.fetch_top_news()
    if not news_data:
        print("FAILED to scrape news")
        return
        
    print(f"Scraped Title: {news_data['title']}")
    print(f"Content Length: {len(news_data['content'])}")
    
    print("\n=== STEP 2: Generate Lesson with AI ===")
    print("This might take a while...")
    try:
        lessons = await ai_service.generate_english_lesson(
            japanese_content=news_data["content"],
            japanese_title=news_data["title"]
        )
        
        if not lessons:
            print("FAILED: AI returned empty lessons list")
            return
            
        print(f"SUCCESS: Generated {len(lessons)} lessons")
        print("\n--- Lesson 1 Preview ---")
        lesson = lessons[0]
        print(f"Title: {lesson.get('title')}")
        print(f"Level: {lesson.get('level')}")
        print(f"Vocab Count: {len(lesson.get('vocabulary', []))}")
        print(f"Content Snippet: {lesson.get('content')[:100]}...")
        
    except Exception as e:
        print(f"EXCEPTION during AI generation: {e}")

if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not found in .env")
    else:
        asyncio.run(debug_full_flow())
