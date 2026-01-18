import httpx
from bs4 import BeautifulSoup
import asyncio

async def test_mainichi_scrape():
    url = "https://mainichi.jp/"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    print(f"Testing URL: {url}")
    
    try:
        async with httpx.AsyncClient(verify=False, headers=headers) as client:
            print("Fetching Top Page...")
            response = await client.get(url, timeout=10.0)
            
            if response.status_code != 200:
                print(f"Failed to fetch page: {response.status_code}")
                return

            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find top news link (structure might vary, looking for primary headline)
            # Mainichi usually has class="headline" or checks within <main>
            
            # Common patterns for top news
            articles = soup.select('section.box-secondary article a') or soup.find_all('a', class_='index-link')
            
            if not articles:
                # Fallback search
                print("Standard selectors failed, dumping all links...")
                links = soup.find_all('a')
                valid_links = [l.get('href') for l in links if l.get('href') and '/articles/' in l.get('href')]
                print(f"Found {len(valid_links)} potential article links: {valid_links[:3]}")
                target_url = "https:" + valid_links[0] if valid_links and valid_links[0].startswith('//') else valid_links[0]
                if not target_url.startswith('http'):
                     target_url = "https://mainichi.jp" + target_url
            else:
                 target_url = "https://mainichi.jp" + articles[0].get('href')

            print(f"Fetching Article: {target_url}")
            
            # Fetch the article content
            article_res = await client.get(target_url, timeout=10.0)
            article_soup = BeautifulSoup(article_res.text, 'html.parser')
            
            # Get Title
            title = article_soup.find('h1').get_text(strip=True)
            print(f"Title: {title}")
            
            # Get Content - Try multiple robust selectors
            body = (
                article_soup.find('section', class_='main-text') or 
                article_soup.find('div', class_='main-text') or 
                article_soup.find('div', id='main-text') or
                article_soup.find('div', class_='article-body')
            )
            
            if body:
                text = body.get_text(strip=True)[:500]
                print(f"Content (Found with selector): {text}...")
            else:
                print("Specific selector failed. Trying loose paragraphs...")
                # Fallback: Find p tags that look like article text (longer than 20 chars)
                paragraphs = article_soup.find_all('p')
                long_ps = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20]
                if long_ps:
                    text = '\n'.join(long_ps[:5]) # First 5 paragraphs
                    print(f"Content (Fallback P tags): {text[:500]}...")
                else:
                    print("Could not find article body even with fallback.")


    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_mainichi_scrape())
