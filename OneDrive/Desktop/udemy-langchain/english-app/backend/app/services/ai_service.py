from openai import AsyncOpenAI
import os
from typing import List, Dict, Optional
import json


class AIService:
    """OpenAI API連携サービス"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def generate_question(self, article_content: str, article_title: str = "") -> str:
        """記事に基づいて質問を生成"""
        prompt = f"""
あなたは英会話トレーニングのコーチです。
以下の記事を読んだ学習者に対して、思考を促す質問を1つ生成してください。

記事タイトル: {article_title}
記事内容:
{article_content}

質問の条件:
- 日本語で質問してください
- 学習者が英語で答えやすいように、具体的で答えやすい質問にしてください
- 記事の内容を深く理解しているか確認できる質問にしてください
- 個人的な意見や経験を引き出す質問が望ましいです

質問のみを出力してください（説明不要）。
"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "あなたは優秀な英会話コーチです。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            question = response.choices[0].message.content.strip()
            return question
        except Exception as e:
            print(f"Error generating question: {e}")
            return "この記事について、あなたの意見を聞かせてください。"
    
    async def analyze_speech(self, transcript: str) -> List[Dict]:
        """発話内容を解析してフィードバックを生成（一文ごと）"""
        prompt = f"""
        あなたは英語学習者向けの高度なフィードバック専門コーチです。

        【重要な背景】
        1. 学習者は日本人です。
        2. 音声認識エンジン（STT）を使用しているため、日本人の名前や日本語固有の単語が、響きの似た「誤った英語」として認識されている可能性が非常に高いです。
           例：「代田（Shirota）」→ 「She wrote a」
           例：「宗田（Soda）」→ 「Soda (炭酸水)」
           例：「名前は...（Namae wa）」→ 「No my way」
        3. 解析を行う前に、まず文脈からこのようなSTTの誤認識（特に人名や固有名詞）を特定し、正しい日本人の名前や意図された表現に頭の中で修正してください。

        【発話内容（未修正のSTTテキスト）】
        {transcript}

        【指示】
        1. 上記の背景を踏まえ、まず文脈から正しい意図を読み取ってください。
        2. **発話内容を、必ずセンテンス（一文）ごとに分解してください。**
        3. **各センテンスについて、文法エラーやより自然な表現、または音声認識エラー（日本人名など）がないか個別に解析してください。**
        4. 日本人名が誤認識されている場合は、その修正後の文を「corrected_sentence」として提示し、理由（reason）で「音声認識の誤り（人名と思われる）」と指摘してください。
        5. 各センテンスのフィードバックを、以下のJSON形式のリストとして出力してください。
        6. 改善点が全くない文については含める必要はありませんが、少しでも不自然な点があれば積極的に指摘してください。
        7. 理由（reason）は必ず日本語で、初心者が理解しやすいよう具体的に（どこの単語をどう変えたか、なぜその方が良いか）簡潔に説明してください。

        【出力形式】
        ```json
        [
          {{
            "original_sentence": "個別の（誤認識された）一文",
            "corrected_sentence": "その一文の修正後の完璧な文",
            "category": "Grammar | Vocabulary | Expression | Pronunciation",
            "reason": "なぜその修正が必要か、具体的かつ簡潔な日本語解説"
          }}
        ]
        ```

        重要: JSONのみを出力し、他の説明は不要です。
        """
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional English coach. Output only raw JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={ "type": "json_object" }
            )
            
            content = response.choices[0].message.content.strip()
            
            try:
                data = json.loads(content)
                if isinstance(data, dict):
                    for key in ["feedback", "feedback_items", "sentences", "items"]:
                        if key in data and isinstance(data[key], list):
                            return data[key]
                return data if isinstance(data, list) else []
            except json.JSONDecodeError:
                print(f"JSON parse error in feedback: {content}")
                return []
                
        except Exception as e:
            print(f"Error analyzing speech: {e}")
            return []
    
    async def summarize_article(self, article_content: str, max_length: int = 200) -> str:
        """記事を要約"""
        prompt = f"""
以下の記事を{max_length}文字程度で要約してください。
日本語で出力してください。

{article_content}
"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "あなたは要約の専門家です。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=300
            )
            
            summary = response.choices[0].message.content.strip()
            return summary
        except Exception as e:
            print(f"Error summarizing article: {e}")
            return article_content[:200] + "..."

    async def generate_english_lesson(self, japanese_content: str, japanese_title: str) -> List[Dict]:
        """
        日本語のニュース記事から1つの高品質な英語レッスン（記事＋質問）を生成
        Format: RareJob DNA Style (Vocab, Article, Discussion A/B)
        
        Returns:
            List[Dict]: [
                {
                    "title": "English Title",
                    "date": "Posted January XX, 2026",
                    "category": "News",
                    "vocabulary": [{"word": "...", "pronunciation": "...", "type": "...", "definition": "...", "example": "..."}],
                    "content": "Article Body...",
                    "discussion_a": ["Q1", "Q2"],
                    "discussion_b": ["Q1", "Q2"],
                    "question": "Main Question",
                    "level": "B2-C1",
                    "japanese_title": "Original Title"
                }
            ]
        """
        from datetime import datetime
        today_str = datetime.now().strftime("Posted %B %d, %Y")

        prompt = f"""
あなたは英会話教材のプロフェッショナルです。
以下の日本語ニュースを元に、高度な語彙と自然な表現を用いた高品質な英語教材を1つ（中上級B2-C1レベル）作成してください。

【元記事（日本語）】
タイトル: {japanese_title}
内容: {japanese_content}

【作成要件】
レッスンは以下の構成要素を必ず含めてください：
1. **Header**: 英語タイトル、日付({today_str})、カテゴリー(News/Sports/Technologyなど)
2. **Unlocking Word Meanings**: 記事内で使われる重要かつ高度な単語5-7個。
   - word, pronunciation (IPA), type (v., n., adj.), definition (英語), example sentence
3. **Article**: ニュース記事本文。
   - 長さ: **最低300単語**（4-6段落構成で、論理的かつ詳細に執筆してください）
   - レベル: B2-C1レベル（自然なコロケーション、多様な構文、高度な語彙を使用）
4. **Viewpoint Discussion**:
   - **Discussion A**: コンテンツの詳細な理解に関する質問 (2-3問)
   - **Discussion B**: 批判的思考や個人的な見解を深く掘り下げるための質問 (2-3問)

【出力形式】
以下のJSON形式のみを出力してください（必ず "lessons" キーを使用し、リスト内に1つのレッスンオブジェクトを含めてください）。
```json
{{
  "lessons": [
    {{
      "title": "Sophisticated English Title",
      "date": "{today_str}",
      "category": "News",
      "vocabulary": [
        {{
            "word": "word",
            "pronunciation": "/.../",
            "type": "(n.)",
            "definition": "Clear and precise English definition...",
            "example": "A natural example sentence using the word..."
        }}
      ],
      "content": "A detailed, high-quality article of at least 300 words...",
      "discussion_a": ["Q1", "Q2"],
      "discussion_b": ["Q1", "Q2"],
      "question": "Main Question to start the discussion",
      "level": "B2-C1"
    }}
  ]
}}
```
"""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional English education content creator. Output valid JSON with 'lessons' key containing a single high-quality lesson."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=3000,
                response_format={ "type": "json_object" }
            )
            
            content = response.choices[0].message.content.strip()
            
            try:
                data = json.loads(content)
                lessons = []
                
                if isinstance(data, dict):
                    if "lessons" in data and isinstance(data["lessons"], list):
                        lessons = data["lessons"]
                    elif "title" in data:
                        lessons = [data]
                
                if not lessons:
                    return []

                # メタデータ付与
                final_lessons = []
                for lesson in lessons:
                    lesson["japanese_title"] = japanese_title
                    if "question" not in lesson and "discussion_a" in lesson and lesson["discussion_a"]:
                        lesson["question"] = lesson["discussion_a"][0]
                    final_lessons.append(lesson)
                
                return final_lessons
                
            except json.JSONDecodeError as je:
                print(f"JSON Decode Error: {je}")
                return []

        except Exception as e:
            print(f"Error in generate_english_lesson: {e}")
            return []

    async def chat_response(self, message: str, history: List[Dict]) -> str:
        """英会話コーチとしてのレスポンスを生成（文脈重視）"""
        system_prompt = """
You are a friendly and encouraging native English tutor. Your goals are:
1. Conduct natural, engaging conversations in English.
2. If the user makes a significant grammar mistake, gently point it out and provide a natural alternative.
3. If the user uses Japanese or asks for a Japanese explanation, provide clear and helpful translations/explanations.
4. Keep your responses concise (2-4 sentences) to keep the dialogue flowing like a real chat.
5. Ask follow-up questions to keep the user engaged.

Context: The user is a Japanese learner. You should focus on being supportive and helping them improve their fluency.
"""
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # 履歴を追加（直近10件程度）
        for msg in history[-10:]:
            messages.append(msg)
            
        # 今の発言を追加
        messages.append({"role": "user", "content": message})
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Chat error: {e}")
            return "Sorry, I'm having trouble connecting right now."
