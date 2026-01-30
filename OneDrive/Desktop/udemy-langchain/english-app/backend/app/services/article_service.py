import httpx
from bs4 import BeautifulSoup
from typing import Optional, Dict


class ArticleService:
    """RareJob DNA記事取得サービス"""
    
    async def fetch_article(self, url: str) -> Optional[Dict[str, str]]:
        """
        指定されたURLから記事を取得
        
        Returns:
            Dict with keys: title, content, url
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        try:
            async with httpx.AsyncClient(verify=False, headers=headers) as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()


                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # タイトル取得（サイト構造に応じて調整が必要）
                title_tag = soup.find('h1') or soup.find('title')
                title = title_tag.get_text(strip=True) if title_tag else "記事タイトル"
                
                # 本文取得（一般的なarticleタグやmainタグを探す）
                article_tag = soup.find('article') or soup.find('main') or soup.find('div', class_='content')
                
                if article_tag:
                    # 段落を取得
                    paragraphs = article_tag.find_all('p')
                    content = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
                else:
                    # フォールバック: すべての段落を取得
                    paragraphs = soup.find_all('p')
                    content = '\n\n'.join([p.get_text(strip=True) for p in paragraphs[:10] if p.get_text(strip=True)])
                
                return {
                    "title": title,
                    "content": content if content else "記事の内容を取得できませんでした。",
                    "url": url
                }
        
        except httpx.HTTPError as e:
            print(f"HTTP error fetching article: {e}")
            return None
        except Exception as e:
            print(f"Error fetching article: {e}")
            return None
    
    async def get_latest_article(self) -> Optional[Dict[str, str]]:
        """
        RareJob DNAの最新記事を取得（実装例）
        ※ 実際のサイト構造に応じて調整が必要
        """
        base_url = "https://www.rarejob.com/dna/"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(base_url, timeout=10.0)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 最新記事のリンクを探す（サイト構造に応じて調整）
                article_link = soup.find('a', class_='article-link')  # 例: クラス名は要調整
                
                if article_link and article_link.get('href'):
                    article_url = article_link['href']
                    if not article_url.startswith('http'):
                        article_url = base_url + article_url.lstrip('/')
                    
                    return await self.fetch_article(article_url)
                
                return None
        
        except Exception as e:
            print(f"Error getting latest article: {e}")
            return None
