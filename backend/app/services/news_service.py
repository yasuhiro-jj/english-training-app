import httpx
from bs4 import BeautifulSoup
from typing import Optional, Dict, List
import random
import time
import asyncio
import logging

logger = logging.getLogger(__name__)

class NewsService:
    """複数のニュースソースから記事を取得するサービス"""
    
    def _get_headers(self) -> Dict[str, str]:
        """403エラー対策のためのヘッダーを取得"""
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://mainichi.jp/",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
    
    async def scrape_article(self, url: str, max_retries: int = 3) -> Optional[Dict[str, str]]:
        """
        指定されたURLの記事をスクレイピング（403エラー対策付き）
        
        Args:
            url: スクレイピングする記事のURL
            max_retries: 最大リトライ回数
        
        Returns:
            Dict with keys: title, content, url
        """
        headers = self._get_headers()
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(verify=False, headers=headers, timeout=15.0) as client:
                    response = await client.get(url, follow_redirects=True)
                    
                    # 403エラーの場合
                    if response.status_code == 403:
                        if attempt < max_retries - 1:
                            # 指数バックオフでリトライ
                            wait_time = 2 ** attempt
                            logger.info(f"403エラー発生。{wait_time}秒待機してリトライ... (試行 {attempt + 1}/{max_retries})")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            raise Exception(f"403 Forbiddenエラー: 記事の取得に失敗しました (URL: {url})")
                    
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # タイトル取得（複数のパターンを試す）
                    title_tag = (
                        soup.find('h1', class_='title') or
                        soup.find('h1', id='title') or
                        soup.find('h1') or
                        soup.find('title')
                    )
                    title = title_tag.get_text(strip=True) if title_tag else "タイトル不明"
                    
                    # 本文取得（複数のパターンを試す）
                    body = (
                        soup.find('section', class_='main-text') or 
                        soup.find('div', class_='main-text') or 
                        soup.find('div', id='main-text') or
                        soup.find('div', class_='article-body') or
                        soup.find('article') or
                        soup.find('div', class_='article-content')
                    )
                    
                    content = ""
                    if body:
                        # 不要な要素を削除
                        for script in body.find_all(['script', 'style', 'nav', 'footer', 'aside']):
                            script.decompose()
                        content = body.get_text(strip=True, separator='\n')
                    else:
                        # フォールバック: 長いPタグを集める
                        paragraphs = soup.find_all('p')
                        long_ps = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20]
                        content = '\n'.join(long_ps[:15])  # より多くの段落を取得
                    
                    if not content or len(content) < 50:
                        if attempt < max_retries - 1:
                            wait_time = 2 ** attempt
                            logger.info(f"コンテンツが取得できませんでした。{wait_time}秒待機してリトライ... (試行 {attempt + 1}/{max_retries})")
                            await asyncio.sleep(wait_time)
                            continue
                        return None
                    
                    return {
                        "title": title,
                        "content": content,
                        "url": url
                    }
                    
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 403 and attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"HTTPステータスエラー: {e.response.status_code}。{wait_time}秒待機してリトライ...")
                    await asyncio.sleep(wait_time)
                    continue
                raise
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"エラー発生: {str(e)}。{wait_time}秒待機してリトライ... (試行 {attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                    continue
                logger.error(f"Error scraping article: {e}")
                return None
        
        return None
    
    async def fetch_top_news(self) -> Optional[Dict[str, str]]:
        """
        毎日新聞のトップニュースを取得
        
        Returns:
            Dict with keys: title, content, url
        """
        base_url = "https://mainichi.jp/"
        headers = self._get_headers()
        
        try:
            async with httpx.AsyncClient(verify=False, headers=headers, timeout=15.0) as client:
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
            logger.error(f"Error fetching news: {e}")
            return None
    
    async def fetch_random_news(self) -> Optional[Dict[str, str]]:
        """
        複数のニュースソースからランダムに記事を取得
        毎日新聞が取得できない場合は、他のソースを試す
        """
        # ニュースソースのリスト（優先順位順）
        sources = [
            ("mainichi", self.fetch_top_news),
            ("bbc", self._fetch_bbc_news),
            ("nhk", self._fetch_nhk_news),
        ]
        
        # ランダムにソースを選ぶ（最初は毎日新聞を優先）
        shuffled_sources = [sources[0]] + random.sample(sources[1:], len(sources) - 1)
        
        for source_name, fetch_func in shuffled_sources:
            try:
                logger.info(f"ニュース取得を試行: {source_name}")
                news_data = await fetch_func()
                if news_data:
                    logger.info(f"ニュース取得成功: {source_name} - {news_data.get('title', 'Unknown')}")
                    return news_data
            except Exception as e:
                logger.warning(f"{source_name}からの取得に失敗: {e}")
                continue
        
        logger.error("すべてのニュースソースからの取得に失敗")
        return None
    
    async def _fetch_bbc_news(self) -> Optional[Dict[str, str]]:
        """
        BBC Newsから記事を取得（英語記事のため、そのまま使用可能）
        """
        try:
            # BBC Newsのトップページから記事を取得
            url = "https://www.bbc.com/news"
            headers = self._get_headers()
            headers["Accept-Language"] = "en-US,en;q=0.9"
            
            async with httpx.AsyncClient(verify=False, headers=headers, timeout=15.0) as client:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 記事リンクを探す
                article_links = soup.find_all('a', {'data-testid': 'internal-link'}) or \
                               soup.select('a[href*="/news/"]')
                
                if not article_links:
                    return None
                
                # 最初の有効な記事リンクを取得
                for link in article_links[:10]:  # 最初の10個を試す
                    href = link.get('href', '')
                    if href and '/news/' in href and href.count('/') >= 4:
                        if not href.startswith('http'):
                            href = f"https://www.bbc.com{href}"
                        
                        # 記事詳細を取得
                        article = await self.scrape_article(href)
                        if article:
                            return article
                
                return None
        except Exception as e:
            logger.warning(f"BBC News取得エラー: {e}")
            return None
    
    async def _fetch_nhk_news(self) -> Optional[Dict[str, str]]:
        """
        NHK News Webから記事を取得
        """
        try:
            url = "https://www3.nhk.or.jp/news/"
            headers = self._get_headers()
            
            async with httpx.AsyncClient(verify=False, headers=headers, timeout=15.0) as client:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 記事リンクを探す
                article_links = soup.select('a[href*="/news/html/"]') or \
                              soup.find_all('a', href=lambda x: x and '/news/html/' in x)
                
                if not article_links:
                    return None
                
                # 最初の有効な記事リンクを取得
                for link in article_links[:5]:
                    href = link.get('href', '')
                    if href:
                        if not href.startswith('http'):
                            href = f"https://www3.nhk.or.jp{href}"
                        
                        # 記事詳細を取得
                        article = await self.scrape_article(href)
                        if article:
                            return article
                
                return None
        except Exception as e:
            logger.warning(f"NHK News取得エラー: {e}")
            return None
