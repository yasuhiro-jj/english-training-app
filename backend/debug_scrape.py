import httpx
from bs4 import BeautifulSoup
import asyncio

async def test_scrape():
    url = "https://www.rarejob.com/dna/2026/01/10/shohei-ohtani-is-the-aps-male-athlete-of-the-year-for-re/"
    # User's URL from screenshot. Note: 2026 might be future if the server isn't aligned, but metadata says 2026.
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    print(f"Testing URL: {url}")
    
    try:
        async with httpx.AsyncClient(verify=False, headers=headers) as client:
            print("Sending request...")
            response = await client.get(url, timeout=10.0)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code != 200:
                print("Failed to fetch page")
                return

            soup = BeautifulSoup(response.text, 'html.parser')
            
            title_tag = soup.find('h1') or soup.find('title')
            title = title_tag.get_text(strip=True) if title_tag else "No Title Found"
            print(f"Title found: {title}")
            
            article_tag = soup.find('article') or soup.find('main') or soup.find('div', class_='content')
            if article_tag:
                print("Article tag found")
                paragraphs = article_tag.find_all('p')
                content = '\n'.join([p.get_text(strip=True) for p in paragraphs[:3]])
                print(f"Content preview: {content[:100]}...")
            else:
                print("No article tag found. Dumping body classes:")
                body = soup.find('body')
                print(body.get('class', []))

    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_scrape())
