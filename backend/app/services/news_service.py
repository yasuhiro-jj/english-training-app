import httpx
from bs4 import BeautifulSoup
from typing import Optional, Dict
import random

class NewsService:
    """毎日新聞のニュース取得サービス"""
    
    async def fetch_top_news(self) -> Optional[Dict[str, str]]:
        """
        毎日新聞のトップニュースを取得 (より堅牢な実装)
        """
        base_url = "https://mainichi.jp/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
        }
        
        try:
            async with httpx.AsyncClient(verify=False, headers=headers, follow_redirects=True) as client:
                # 1. トップページ取得
                print(f"[Backend] Fetching Mainichi top page: {base_url}")
                response = await client.get(base_url, timeout=15.0)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 2. 記事リンクの探索 (優先順位順)
                # a. 最近のメイン記事
                # b. 特集エリア
                # c. 全ての /articles/ リンク
                potential_links = []
                
                # パターン1: 標準的なメイン記事セレクタ
                articles = soup.select('section.box-secondary article a')
                for a in articles:
                    href = a.get('href')
                    if href and '/articles/' in href:
                        potential_links.append(href)
                
                # パターン2: index-linkクラス
                if not potential_links:
                    for a in soup.find_all('a', class_='index-link'):
                        href = a.get('href')
                        if href and '/articles/' in href:
                            potential_links.append(href)

                # パターン3: 全リンクからの抽出 (フォールバック)
                if not potential_links:
                    for a in soup.find_all('a'):
                        href = a.get('href')
                        if href and '/articles/' in href:
                            potential_links.append(href)

                if not potential_links:
                    print("[Backend] No article links found at all")
                    return None

                # 重複削除
                unique_links = list(dict.fromkeys(potential_links))
                print(f"[Backend] Found {len(unique_links)} potential articles")

                # 3. 内容が取得できるまで試行 (最大3つ)
                for target_url in unique_links[:3]:
                    # 相対パスなら絶対パスに変換
                    if target_url.startswith('//'):
                        target_url = "https:" + target_url
                    elif not target_url.startswith('http'):
                        target_url = "https://mainichi.jp/" + target_url.lstrip('/')
                    
                    print(f"[Backend] Trying article: {target_url}")
                    try:
                        article_res = await client.get(target_url, timeout=10.0)
                        if article_res.status_code != 200:
                            continue

                        article_soup = BeautifulSoup(article_res.text, 'html.parser')
                        
                        # タイトル
                        title_tag = article_soup.find('h1')
                        title = title_tag.get_text(strip=True) if title_tag else "タイトル不明"
                        
                        # 有料記事は避ける（または警告）
                        paywall = article_soup.find(class_='paywall') or article_soup.find(id='paywall')
                        if paywall:
                            print(f"[Backend] Skipping paid article: {title}")
                            continue

                        # 本文抽出
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
                            # Pタグから抽出
                            paragraphs = article_soup.find_all('p')
                            long_ps = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 25]
                            if len(long_ps) >= 2: # 最低2段落は欲しい
                                content = '\n'.join(long_ps[:12])
                        
                        # 十分な長さがあるか確認 (短すぎるとAI生成が適当になる)
                        if content and len(content) > 100:
                            print(f"[Backend] Successfully extracted content: {len(content)} chars")
                            return {
                                "title": title,
                                "content": content,
                                "url": target_url
                            }
                        else:
                            print(f"[Backend] Content too short ({len(content) if content else 0}), trying next")
                            
                    except Exception as e:
                        print(f"[Backend] Failed to fetch article {target_url}: {e}")
                        continue

                # 全て失敗した場合の最終手段（モック記事）
                print("[Backend] All articles failed. Using emergency mock content.")
                return {
                    "title": "Daily English Practice",
                    "content": "Today we will focus on general conversation skills. English is a global language used in business, science, and tourism. Learning English opening doors to new opportunities and cultures. Practice speaking every day to improve your fluency and confidence.",
                    "url": "https://mainichi.jp/fallback"
                }
        
        except Exception as e:
            print(f"Error in fetch_top_news: {e}")
            return None
