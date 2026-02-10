from openai import AsyncOpenAI
import os
from typing import List, Dict, Optional
import json


class AIService:
    """OpenAI API連携サービス"""

    _LEVEL_MAPPING = {
        1: "A1-A2 (Beginner)",
        2: "B1-B2 (Intermediate)",
        3: "B2-C1 (Advanced)",
    }

    def _level_constraints(self, level: int) -> Dict[str, str]:
        """
        難易度に応じた制約を返す（プロンプト用）。
        levelは 1=初心者, 2=中級, 3=上級 を想定。
        """
        if level == 1:
            return {
                "cefr": "A1-A2",
                "article_words": "150-200 words",
                "style": (
                    "Use very short sentences (8-12 words average). Prefer present simple. "
                    "Avoid idioms, phrasal verbs, and rare words. Avoid abstract nouns. "
                    "Use very common verbs (get, make, go, have, take, want, need). "
                    "Do NOT use advanced linking words like: however, therefore, moreover, consequently."
                ),
                "vocab": "5-7 easy, high-frequency words (A1-A2). Keep definitions very simple.",
            }
        if level == 2:
            return {
                "cefr": "B1-B2",
                "article_words": "200-260 words",
                "style": "Use clear sentences. Avoid overly complex clauses. Use common collocations. Keep it readable.",
                "vocab": "5-7 useful words (B1-B2). Definitions should be clear and learner-friendly.",
            }
        # default: level 3
        return {
            "cefr": "B2-C1",
            "article_words": "260-320 words",
            "style": "Use natural but not overly academic English. Use a mix of sentence structures, but keep it comprehensible.",
            "vocab": "5-7 advanced but practical words (B2-C1). Definitions should be precise but understandable.",
        }
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        # 起動時に環境変数が未設定でもサーバー全体が落ちないようにする
        # （実際にAI機能を使うタイミングで明示的にエラーにする）
        if not api_key:
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key)

    def _require_client(self) -> AsyncOpenAI:
        if self.client is None:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        return self.client
    
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
            response = await self._require_client().chat.completions.create(
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
            response = await self._require_client().chat.completions.create(
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
            response = await self._require_client().chat.completions.create(
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

    async def generate_english_lesson(self, japanese_content: str, japanese_title: str, level: int = 2, length: str = "約500文字（日本語換算）") -> List[Dict]:
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

        level_str = self._LEVEL_MAPPING.get(level, "B1-B2 (Intermediate)")
        c = self._level_constraints(level)

        prompt = f"""
あなたは英会話教材のプロフェッショナルです。
以下の日本語ニュースを元に、わかりやすく読みやすい英語教材を1つ作成してください。

【難易度指定（最重要）】
- 学習者レベル: {level}（1=初心者 / 2=中級 / 3=上級）
- CEFR目安: {c["cefr"]}（必ずこのレベルに合わせること）
- 文体: {c["style"]}

【元記事（日本語）】
タイトル: {japanese_title}
内容: {japanese_content}

【作成要件】
レッスンは以下の構成要素を必ず含めてください：
1. **Header**: 英語タイトル、日付({today_str})、カテゴリー(News/Sports/Technologyなど)
2. **Unlocking Word Meanings**: {c["vocab"]}
   - word, pronunciation (IPA), type (v., n., adj.), definition (英語、わかりやすく), example sentence
3. **Article**: ニュース記事本文。
   - 長さ: **{c["article_words"]}**（3-4段落構成で、わかりやすく簡潔に執筆してください）
   - レベル: CEFR {c["cefr"]} に必ず合わせる
   - 重要: レベル不一致（難しすぎ/易しすぎ）はNG。特に初心者は簡単な語彙・文法のみで書くこと。
4. **Viewpoint Discussion**:
   - **Discussion A**: コンテンツの理解に関する質問 (2-3問)
   - **Discussion B**: 個人的な見解を聞く質問 (2-3問)

【出力形式】
以下のJSON形式のみを出力してください（必ず "lessons" キーを使用し、リスト内に1つのレッスンオブジェクトを含めてください）。
```json
{{
  "lessons": [
    {{
                    "title": "Clear and Simple English Title",
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
      "content": "Article body...",
      "discussion_a": ["Q1", "Q2"],
      "discussion_b": ["Q1", "Q2"],
      "question": "Main Question to start the discussion",
      "level": "{level}"
    }}
  ]
}}
```
"""
        print(f"[Backend] AI Prompt constructed (first 200 chars): {prompt[:200]}...")
        
        response = await self._require_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a professional English education content creator. Create one lesson strictly for learner level {level} (CEFR {c['cefr']}). Follow constraints exactly. Output valid JSON with 'lessons' key containing a single lesson. The lesson.level MUST be '{level}'."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2500,
            response_format={ "type": "json_object" }
        )
        
        content = response.choices[0].message.content.strip()
        print(f"[Backend] AI Raw Response (first 200 chars): {content[:200]}...")
        
        try:
            data = json.loads(content)
            print(f"[Backend] JSON parsed successfully. Keys: {data.keys()}")
            lessons = []
            
            if isinstance(data, dict):
                if "lessons" in data and isinstance(data["lessons"], list):
                    lessons = data["lessons"]
                elif "title" in data:
                    lessons = [data]
            
            if not lessons:
                print("[Backend] No lessons found in parsed data")
                return []

            # メタデータ付与
            final_lessons = []
            for lesson in lessons:
                lesson["japanese_title"] = japanese_title
                # UI/Notion用: levelは必ず 1/2/3 の文字列に正規化
                lesson["level"] = str(level)
                if "question" not in lesson and "discussion_a" in lesson and lesson["discussion_a"]:
                    lesson["question"] = lesson["discussion_a"][0]
                final_lessons.append(lesson)
            
            return final_lessons
            
        except json.JSONDecodeError as je:
            print(f"[Backend] JSON Decode Error: {je}")
            return []
        except Exception as e:
            print(f"[Backend] Unexpected error after AI completion: {e}")
            import traceback
            traceback.print_exc()
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
            response = await self._require_client().chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Chat error: {e}")
            return "Sorry, I'm having trouble connecting right now."
