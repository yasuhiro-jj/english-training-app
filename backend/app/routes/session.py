from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import SessionCreate, SessionResponse, TranscriptSubmit, AnalysisResponse, LessonGenerateResponse
from app.services import AIService, ArticleService, NotionService, NewsService
from app.deps import get_current_user
import uuid
from datetime import datetime

router = APIRouter(prefix="/api", tags=["session"])

# サービスのインスタンス化
ai_service = AIService()
article_service = ArticleService()
notion_service = NotionService()
news_service = NewsService()

# セッション管理用の簡易ストレージ（本番環境ではRedisなどを使用）
sessions = {}


@router.get("/session/generate", response_model=LessonGenerateResponse)
async def generate_lessons():
    """
    毎日新聞のトップ記事から英語レッスンを生成
    """
    try:
        # 1. ニュース取得
        news_data = await news_service.fetch_top_news()
        
        if not news_data:
            raise HTTPException(status_code=404, detail="ニュース記事の取得に失敗しました")
            
        # 2. レッスン生成
        lessons = await ai_service.generate_english_lesson(
            japanese_content=news_data["content"],
            japanese_title=news_data["title"]
        )
        
        if not lessons:
            raise HTTPException(status_code=500, detail="レッスンの生成に失敗しました")
            
        return {"lessons": lessons}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Generate Error: {e}")
        raise HTTPException(status_code=500, detail=f"生成エラー: {str(e)}")



@router.post("/session/start", response_model=SessionResponse)
async def start_session(request: SessionCreate):
    """
    新しいセッションを開始
    - URL指定の場合: 記事を取得して質問生成
    - コンテンツ指定の場合: そのままセッション開始
    """
    try:
        question = ""
        summary = ""
        article_title = ""
        article_content = ""
        
        # パターンA: 生成済みコンテンツを使用（新仕様）
        if request.custom_content:
            article_content = request.custom_content
            article_title = request.custom_title or "Generated Lesson"
            question = request.custom_question or "What do you think about this news?"
            summary = "（生成済み英語記事のため要約スキップ）"
            
        # パターンB: URLから記事取得（旧仕様・互換性維持）
        elif request.article_url:
            article_data = await article_service.fetch_article(request.article_url)
            if not article_data:
                raise HTTPException(status_code=400, detail="記事が見つかりません。URLが正しいか確認してください。（404 Not Found）")
            
            article_title = article_data["title"]
            article_content = article_data["content"]
            
            # 質問を生成
            question = await ai_service.generate_question(
                article_content=article_content,
                article_title=article_title
            )
            summary = await ai_service.summarize_article(article_content)
            
        else:
             raise HTTPException(status_code=400, detail="URLまたはコンテンツが必要です")
        
        # セッションIDを生成
        session_id = str(uuid.uuid4())
        
        # セッション情報を保存
        sessions[session_id] = {
            "article_url": request.article_url or "generated",
            "article_title": article_title,
            "article_content": article_content,
            "question": question,
            "topic": request.topic or article_title,
            "created_at": datetime.now().isoformat()
        }
        
        return SessionResponse(
            session_id=session_id,
            question=question,
            article_summary=summary
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=f"サーバーエラー: {str(e)}")



@router.post("/session/submit", response_model=AnalysisResponse)
async def submit_transcript(request: TranscriptSubmit, user: dict = Depends(get_current_user)):
    """
    音声テキストを送信し、解析を実行
    - 会話ログをNotionに保存
    - フィードバックを生成してNotionに保存
    """
    user_email = user.get("email")
    try:
        # セッション情報を取得
        session = sessions.get(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        # 発話を解析（これがメイン機能）
        feedback_items = await ai_service.analyze_speech(request.transcript)
        
        # 会話ログをNotionに保存（失敗しても続行）
        try:
            not_service_res = notion_service.create_conversation_log(
                topic=session["topic"],
                article_url=session["article_url"],
                full_transcript=request.transcript,
                duration_seconds=request.duration_seconds,
                user_email=user_email
            )
        except Exception as e:
            print(f"Notion conversation log save failed (non-critical): {e}")
        
        # フィードバックをNotionに保存（失敗しても続行）
        if feedback_items:
            try:
                notion_service.create_multiple_feedback_items(
                    feedback_items=feedback_items,
                    session_id=request.session_id,
                    user_email=user_email
                )
            except Exception as e:
                print(f"Notion feedback save failed (non-critical): {e}")
        
        return AnalysisResponse(
            session_id=request.session_id,
            feedback_count=len(feedback_items),
            feedback_items=feedback_items,
            message=f"{len(feedback_items)}件のフィードバックを記録しました" if feedback_items else "素晴らしい！改善点は見つかりませんでした"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析エラー: {str(e)}")


@router.get("/feedback/recent")
async def get_recent_feedback(limit: int = 10, user: dict = Depends(get_current_user)):
    """最近のフィードバックを取得"""
    try:
        feedback = notion_service.get_recent_feedback(email=user.get("email"), limit=limit)
        return {"feedback": feedback}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"フィードバック取得エラー: {str(e)}")
