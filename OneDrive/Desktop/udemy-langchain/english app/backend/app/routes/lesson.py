from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import LessonGenerateRequest, LessonGenerateResponse
from app.services import AIService, NewsService, NotionService
from app.deps import get_current_user
import logging

router = APIRouter(prefix="/lesson", tags=["lesson"])

# サービスのインスタンス化
ai_service = AIService()
news_service = NewsService()
notion_service = NotionService()

logger = logging.getLogger(__name__)


@router.post("/generate", response_model=LessonGenerateResponse)
async def generate_lesson(
    request: LessonGenerateRequest,
    user: dict = Depends(get_current_user),
):
    """
    Daily News Englishレッスンを生成（URL指定版）
    
    指定された記事URLからスクレイピングし、
    OpenAI APIで英語レッスンを生成します。
    """
    try:
        # 1. 記事をスクレイピング
        logger.info(f"記事をスクレイピング開始: {request.news_url}")
        article = await news_service.scrape_article(request.news_url)
        
        if not article:
            logger.error(f"記事の取得に失敗: {request.news_url}")
            raise HTTPException(
                status_code=400,
                detail="記事の取得に失敗しました。URLが正しいか、アクセス可能か確認してください。"
            )
        
        logger.info(f"記事取得成功: {article['title']}")
        
        # 2. OpenAI APIでレッスンを生成
        logger.info("レッスン生成開始")
        lessons = await ai_service.generate_english_lesson(
            japanese_content=article["content"],
            japanese_title=article["title"]
        )
        
        if not lessons:
            logger.error("レッスンの生成に失敗")
            raise HTTPException(
                status_code=500,
                detail="レッスンの生成に失敗しました。"
            )
        
        logger.info(f"レッスン生成成功: {len(lessons)}件")

        # 3. Notionに保存（失敗してもレスポンスは返す）
        user_email = user.get("email", "")
        logger.info(f"[Backend] Saving {len(lessons)} lessons to Notion...")
        print(f"[Backend] Saving {len(lessons)} lessons to Notion...")

        for lesson in lessons:
            try:
                if hasattr(lesson, "model_dump"):
                    lesson_dict = lesson.model_dump()  # Pydantic v2
                elif hasattr(lesson, "dict"):
                    lesson_dict = lesson.dict()  # Pydantic v1
                else:
                    lesson_dict = lesson

                lesson_title = lesson_dict.get("title", "Untitled Lesson")
                print(f"[Backend] Saving lesson to Notion: {lesson_title}")
                page_id = notion_service.save_lesson(lesson_dict, user_email)
                if page_id:
                    print(f"[Backend] ✅ Lesson saved to Notion: {lesson_title} (Page ID: {page_id})")
                else:
                    print(f"[Backend] ⚠️ Lesson save skipped: {lesson_title}")
            except Exception as e:
                lesson_title = getattr(lesson, "title", "Unknown")
                logger.error(f"レッスンのNotion保存に失敗（処理は続行）: {lesson_title}, エラー: {str(e)}", exc_info=True)
                print(f"[Backend] ❌ Failed to save lesson to Notion: {lesson_title}, Error: {e}")

        return LessonGenerateResponse(lessons=lessons)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"予期しないエラー: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"レッスン生成中にエラーが発生しました: {str(e)}"
        )


@router.get("/generate/auto", response_model=LessonGenerateResponse)
async def generate_lesson_auto(user: dict = Depends(get_current_user)):
    """
    自動でニュース記事を取得してレッスンを生成（URL指定なし）
    
    複数のニュースソースから自動的に記事を取得し、
    OpenAI APIで英語レッスンを生成します。
    """
    try:
        # 1. 複数のニュースソースから自動で記事を取得
        logger.info("自動ニュース取得開始")
        article = await news_service.fetch_random_news()
        
        if not article:
            logger.error("記事の自動取得に失敗")
            raise HTTPException(
                status_code=404,
                detail="ニュース記事の取得に失敗しました。しばらく時間をおいて再度お試しください。"
            )
        
        logger.info(f"記事取得成功: {article['title']} (URL: {article.get('url', 'Unknown')})")
        
        # 2. OpenAI APIでレッスンを生成
        logger.info("レッスン生成開始")
        lessons = await ai_service.generate_english_lesson(
            japanese_content=article["content"],
            japanese_title=article["title"]
        )
        
        if not lessons:
            logger.error("レッスンの生成に失敗")
            raise HTTPException(
                status_code=500,
                detail="レッスンの生成に失敗しました。"
            )
        
        logger.info(f"レッスン生成成功: {len(lessons)}件")

        # 3. Notionに保存（失敗してもレスポンスは返す）
        user_email = user.get("email", "")
        logger.info(f"[Backend] Saving {len(lessons)} lessons to Notion...")
        print(f"[Backend] Saving {len(lessons)} lessons to Notion...")

        for lesson in lessons:
            try:
                if hasattr(lesson, "model_dump"):
                    lesson_dict = lesson.model_dump()  # Pydantic v2
                elif hasattr(lesson, "dict"):
                    lesson_dict = lesson.dict()  # Pydantic v1
                else:
                    lesson_dict = lesson

                lesson_title = lesson_dict.get("title", "Untitled Lesson")
                print(f"[Backend] Saving lesson to Notion: {lesson_title}")
                page_id = notion_service.save_lesson(lesson_dict, user_email)
                if page_id:
                    print(f"[Backend] ✅ Lesson saved to Notion: {lesson_title} (Page ID: {page_id})")
                else:
                    print(f"[Backend] ⚠️ Lesson save skipped: {lesson_title}")
            except Exception as e:
                lesson_title = getattr(lesson, "title", "Unknown")
                logger.error(f"レッスンのNotion保存に失敗（処理は続行）: {lesson_title}, エラー: {str(e)}", exc_info=True)
                print(f"[Backend] ❌ Failed to save lesson to Notion: {lesson_title}, Error: {e}")

        return LessonGenerateResponse(lessons=lessons)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"予期しないエラー: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"レッスン生成中にエラーが発生しました: {str(e)}"
        )
