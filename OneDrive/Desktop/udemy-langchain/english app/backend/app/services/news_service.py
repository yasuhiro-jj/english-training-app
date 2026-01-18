import httpx
from bs4 import BeautifulSoup
from typing import Optional, Dict
import random

class NewsService:
    """毎日新聞のニュース取得サービス"""
    
    async def fetch_top_news(self) -> Optional[Dict[str, str]]:
        """
        毎日新聞のトップニュースを取得
        
        Returns:
            Dict with keys: title, content, url
        """
        base_url = "https://mainichi.jp/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        try:
            async with httpx.AsyncClient(verify=False, headers=headers) as client:
                # 1. トップページ取得
                response = await client.get(base_url, timeout=10.0)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 2. 記事リンクを探す
                # 複数のパターンでトップ記事のリンクを探す
                articles = soup.select('section.box-secondary article a') or soup.find_all('a', class_='index-link')
                
                target_url = ""
                if articles:
                     target_url = articles[0].get('href')
                else:
                    # フォールバック: /articles/ を含むリンクを探す
                    links = soup.find_all('a')
                    valid_links = [l.get('href') for l in links if l.get('href') and '/articles/' in l.get('href')]
                    if valid_links:
                        target_url = valid_links[0]
                
                if not target_url:
                    raise Exception("記事リンクが見つかりませんでした")
                
                # 相対パスなら絶対パスに変換
                if target_url.startswith('//'):
                    target_url = "https:" + target_url
                elif not target_url.startswith('http'):
                    target_url = "https://mainichi.jp" + target_url.lstrip('/')
                
                # 3. 記事詳細取得
                article_res = await client.get(target_url, timeout=10.0)
                article_soup = BeautifulSoup(article_res.text, 'html.parser')
                
                # タイトル取得
                title_tag = article_soup.find('h1')
                title = title_tag.get_text(strip=True) if title_tag else "タイトル不明"
                
                # 本文取得
                body = (
                    article_soup.find('section', class_='main-text') or 
                    article_soup.find('div', class_='main-text') or 
                    article_soup.find('div', id='main-text') or
                    article_soup.find('div', class_='article-body')
                )
                
                content = ""
                if body:
                    content = body.get_text(strip=True)
                else:
                    # フォールバック: 長いPタグを集める
                    paragraphs = article_soup.find_all('p')
                    long_ps = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20]
                    content = '\n'.join(long_ps[:10])  # 十分な量を取得
                
                if not content:
                    return None
                    
                return {
                    "title": title,
                    "content": content,
                    "url": target_url
                }
        
        except Exception as e:
            print(f"Error fetching news: {e}")
            return None
