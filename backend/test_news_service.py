import asyncio
import sys
import os

# Add the current directory to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.news_service import NewsService

async def test_news():
    service = NewsService()
    print("Fetching top news...")
    news = await service.fetch_top_news()
    if news:
        print(f"Success!")
        print(f"Title: {news['title']}")
        print(f"URL: {news['url']}")
        print(f"Content Length: {len(news['content'])}")
        # print(f"Content Sample: {news['content'][:200]}...")
    else:
        print("Failed to fetch news.")

if __name__ == "__main__":
    asyncio.run(test_news())
