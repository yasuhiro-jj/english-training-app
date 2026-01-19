import httpx
from bs4 import BeautifulSoup
import asyncio
import sys

async def test_mainichi_scrape():
    url = "https://mainichi.jp/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    print(f"--- STEP 1: Fetching Top Page ({url}) ---")
    try:
        async with httpx.AsyncClient(verify=False, headers=headers) as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code != 200:
                print(f"FAILED to fetch top page: {response.status_code}")
                return

            soup = BeautifulSoup(response.text, 'html.parser')
            
            print("--- STEP 2: Finding Article Link ---")
            # Selectors from NewsService
            articles = soup.select('section.box-secondary article a') or soup.find_all('a', class_='index-link')
            
            target_url = ""
            if articles:
                 print(f"Found {len(articles)} articles with standard selectors.")
                 target_url = articles[0].get('href')
            else:
                print("Standard selectors failed, trying fallback...")
                links = soup.find_all('a')
                valid_links = [l.get('href') for l in links if l.get('href') and '/articles/' in l.get('href')]
                if valid_links:
                    print(f"Found {len(valid_links)} fallback links.")
                    target_url = valid_links[0]
                else:
                    print("CRITICAL: No article links found at all.")
                    return

            # Clean URL
            if target_url.startswith('//'):
                target_url = "https:" + target_url
            elif not target_url.startswith('http'):
                target_url = "https://mainichi.jp/" + target_url.lstrip('/')
            
            print(f"Target URL: {target_url}")

            print("--- STEP 3: Fetching Article Page ---")
            article_res = await client.get(target_url, timeout=10.0)
            if article_res.status_code != 200:
                print(f"FAILED to fetch article page: {article_res.status_code}")
                return

            article_soup = BeautifulSoup(article_res.text, 'html.parser')
            
            # Get Title
            title_tag = article_soup.find('h1')
            title = title_tag.get_text(strip=True) if title_tag else "NO TITLE FOUND"
            print(f"Title: {title}")
            
            print("--- STEP 4: Extracting Content ---")
            body = (
                article_soup.find('section', class_='main-text') or 
                article_soup.find('div', class_='main-text') or 
                article_soup.find('div', id='main-text') or
                article_soup.find('div', class_='article-body')
            )
            
            if body:
                content = body.get_text(strip=True)
                print(f"SUCCESS: Content found with primary selector. Length: {len(content)}")
                print(f"Snippet: {content[:100]}...")
            else:
                print("Primary content selectors failed, trying fallback paragraphs...")
                paragraphs = article_soup.find_all('p')
                long_ps = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20]
                if long_ps:
                    content = '\n'.join(long_ps[:10])
                    print(f"SUCCESS: Content found with fallback P tags. Length: {len(content)}")
                    print(f"Snippet: {content[:100]}...")
                else:
                    print("CRITICAL: No content found.")

    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(test_mainichi_scrape())
