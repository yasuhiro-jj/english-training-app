import httpx
from bs4 import BeautifulSoup
from typing import Optional, Dict
import random

class NewsService:
    """毎日新聞のニュース取得サービス"""
    
    async def fetch_top_news(self) -> Optional[Dict[str, str]]:
        """
        英語学習用のトピックを提供（スクレイピング不要）
        """
        import random
        
        # 英語学習に適したトピック集
        topics = [
            {
                "title": "The Benefits of Learning English",
                "content": "English has become the global language of business, science, and international communication. Learning English opens doors to countless opportunities in education and career advancement. It allows you to connect with people from different cultures and access a wealth of information online. Many of the world's top universities teach in English, making it essential for academic success. Business professionals who speak English have better job prospects and higher earning potential. The internet is predominantly in English, giving English speakers access to more resources. Travel becomes easier when you can communicate in English, as it's spoken in many countries. Learning English also improves cognitive abilities and problem-solving skills. It's never too late to start learning, and consistent practice leads to fluency over time.",
                "url": "https://example.com/english-learning"
            },
            {
                "title": "Technology and Modern Life",
                "content": "Technology has transformed how we live, work, and communicate in the 21st century. Smartphones have become essential tools for staying connected with friends and family. Social media platforms allow us to share experiences and ideas with people worldwide. Artificial intelligence is revolutionizing industries from healthcare to transportation. Remote work has become increasingly common, offering flexibility and work-life balance. Online shopping has changed retail, making products accessible with just a few clicks. Digital education platforms provide learning opportunities to people everywhere. However, technology also presents challenges such as privacy concerns and screen addiction. Finding a healthy balance between digital and real-world interactions is important. The future promises even more technological innovations that will shape our daily lives.",
                "url": "https://example.com/technology"
            },
            {
                "title": "Environmental Conservation",
                "content": "Protecting our environment is one of the most important challenges facing humanity today. Climate change is causing rising temperatures and extreme weather events around the world. Reducing carbon emissions through renewable energy is crucial for our planet's future. Plastic pollution in oceans threatens marine life and ecosystems. Recycling and reducing waste help minimize our environmental impact. Forests play a vital role in absorbing carbon dioxide and producing oxygen. Sustainable practices in agriculture and industry can help preserve natural resources. Individual actions like using public transportation and conserving energy make a difference. Governments and businesses must work together to implement environmental policies. Education about environmental issues is key to creating lasting change for future generations.",
                "url": "https://example.com/environment"
            },
            {
                "title": "Health and Wellness",
                "content": "Maintaining good health requires a balanced approach to diet, exercise, and mental well-being. Regular physical activity strengthens the body and improves cardiovascular health. A nutritious diet rich in fruits and vegetables provides essential vitamins and minerals. Getting adequate sleep is crucial for physical recovery and mental clarity. Stress management through meditation or hobbies helps maintain emotional balance. Preventive healthcare, including regular check-ups, can detect issues early. Staying hydrated by drinking enough water supports all bodily functions. Social connections and relationships contribute significantly to overall happiness and health. Avoiding harmful habits like smoking and excessive alcohol consumption is important. Taking care of both physical and mental health leads to a better quality of life.",
                "url": "https://example.com/health"
            },
            {
                "title": "Cultural Exchange and Travel",
                "content": "Traveling to different countries broadens our perspectives and enriches our understanding of the world. Experiencing new cultures helps us appreciate diversity and different ways of life. Learning about local customs and traditions shows respect for the communities we visit. Trying authentic cuisine is one of the most enjoyable aspects of international travel. Language barriers can be overcome with patience, gestures, and translation apps. Historical sites and museums offer insights into a country's heritage and development. Meeting people from different backgrounds creates lasting friendships and connections. Travel teaches adaptability and problem-solving skills in unfamiliar situations. Sustainable tourism practices help preserve destinations for future generations. The memories and experiences gained from travel stay with us forever.",
                "url": "https://example.com/travel"
            }
        ]
        
        # ランダムにトピックを選択
        selected_topic = random.choice(topics)
        print(f"[Backend] Using topic: {selected_topic['title']}")
        
        return selected_topic

        """
        毎日新聞のトップニュースを取得 (より堅牢な実装)
        """
        base_url = "https://mainichi.jp/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0"
        }
        
        try:
            async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20.0) as client:
                # 1. トップページ取得
                print(f"[Backend] Fetching Mainichi top page: {base_url}")
                response = await client.get(base_url)
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
        
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                print(f"[Backend] 403 Forbidden - Website blocking access. Using fallback content.")
                return {
                    "title": "English Communication Skills",
                    "content": "Effective communication in English requires practice and confidence. Start with simple conversations and gradually increase complexity. Listen actively to native speakers and try to mimic their pronunciation. Reading English articles daily helps expand your vocabulary. Writing practice is equally important for improving grammar. Don't hesitate to ask questions when you don't understand something. Join English conversation groups to practice with others. Remember that fluency comes with consistent practice over time.",
                    "url": "https://mainichi.jp/fallback"
                }
            else:
                print(f"[Backend] HTTP error {e.response.status_code}: {e}")
                return None
        except Exception as e:
            print(f"Error in fetch_top_news: {e}")
            return None
