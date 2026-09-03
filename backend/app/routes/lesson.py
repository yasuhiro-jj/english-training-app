from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import LessonGenerateRequest, LessonGenerateResponse, LessonOption
from app.services import AIService, NewsService, NotionService
from app.deps import get_current_user
import logging
from typing import List, Dict

router = APIRouter(prefix="/api/lesson", tags=["lesson"])

# サービスのインスタンス化
ai_service = AIService()
news_service = NewsService()
notion_service = NotionService()

logger = logging.getLogger(__name__)


@router.post("/generate", response_model=LessonGenerateResponse)
async def generate_lesson(
    request: LessonGenerateRequest,
    user: dict = Depends(get_current_user),
    level: int = 2
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
            japanese_title=article["title"],
            level=level
        )
        
        if not lessons:
            logger.error("レッスンの生成に失敗")
            raise HTTPException(
                status_code=500,
                detail="レッスンの生成に失敗しました。"
            )
        
        logger.info(f"レッスン生成成功: {len(lessons)}件")
        
        # 3. 生成したレッスンをNotionに保存（各レッスンごと）
        user_email = user.get("email", "")
        logger.info(f"Notion保存開始: ユーザー={user_email}, レッスン数={len(lessons)}")
        for lesson in lessons:
            try:
                # Pydanticモデルを辞書に変換
                if hasattr(lesson, 'model_dump'):
                    lesson_dict = lesson.model_dump()  # Pydantic v2
                elif hasattr(lesson, 'dict'):
                    lesson_dict = lesson.dict()  # Pydantic v1
                else:
                    lesson_dict = lesson  # 既に辞書の場合
                
                # lessonがdictの場合に備えて、titleを安全に取得
                lesson_title = lesson_dict.get('title', 'Unknown') if isinstance(lesson_dict, dict) else getattr(lesson, 'title', 'Unknown')
                
                logger.info(f"レッスンをNotionに保存開始: {lesson_title}")
                page_id = notion_service.save_lesson(lesson_dict, user_email)
                if page_id:
                    logger.info(f"レッスンをNotionに保存成功: {lesson_title} (Page ID: {page_id})")
                else:
                    logger.warning(f"レッスンのNotion保存がスキップされました: {lesson_title} (環境変数が設定されていない可能性があります)")
            except Exception as e:
                # lesson_dictが定義されていない場合に備えて、lessonから直接取得を試みる
                try:
                    lesson_title = lesson_dict.get('title', 'Unknown') if isinstance(lesson_dict, dict) else getattr(lesson, 'title', 'Unknown')
                except:
                    lesson_title = lesson.get('title', 'Unknown') if isinstance(lesson, dict) else 'Unknown'
                logger.error(f"レッスンのNotion保存に失敗（処理は続行）: {lesson_title}, エラー: {str(e)}", exc_info=True)
        
        return LessonGenerateResponse(lessons=lessons)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"予期しないエラー: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="レッスン生成中にエラーが発生しました。しばらくしてから再度お試しください。"
        )


@router.get("/generate/auto", response_model=LessonGenerateResponse)
async def generate_lesson_auto(user: dict = Depends(get_current_user), level: int = 2):
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
            japanese_title=article["title"],
            level=level
        )
        
        if not lessons:
            logger.error("レッスンの生成に失敗")
            raise HTTPException(
                status_code=500,
                detail="レッスンの生成に失敗しました。"
            )
        
        logger.info(f"レッスン生成成功: {len(lessons)}件")
        
        # 3. 生成したレッスンをNotionに保存（各レッスンごと）
        user_email = user.get("email", "")
        logger.info(f"Notion保存開始: ユーザー={user_email}, レッスン数={len(lessons)}")
        for lesson in lessons:
            try:
                # Pydanticモデルを辞書に変換
                if hasattr(lesson, 'model_dump'):
                    lesson_dict = lesson.model_dump()  # Pydantic v2
                elif hasattr(lesson, 'dict'):
                    lesson_dict = lesson.dict()  # Pydantic v1
                else:
                    lesson_dict = lesson  # 既に辞書の場合
                
                # lessonがdictの場合に備えて、titleを安全に取得
                lesson_title = lesson_dict.get('title', 'Unknown') if isinstance(lesson_dict, dict) else getattr(lesson, 'title', 'Unknown')
                
                logger.info(f"レッスンをNotionに保存開始: {lesson_title}")
                page_id = notion_service.save_lesson(lesson_dict, user_email)
                if page_id:
                    logger.info(f"レッスンをNotionに保存成功: {lesson_title} (Page ID: {page_id})")
                else:
                    logger.warning(f"レッスンのNotion保存がスキップされました: {lesson_title} (環境変数が設定されていない可能性があります)")
            except Exception as e:
                # lesson_dictが定義されていない場合に備えて、lessonから直接取得を試みる
                try:
                    lesson_title = lesson_dict.get('title', 'Unknown') if isinstance(lesson_dict, dict) else getattr(lesson, 'title', 'Unknown')
                except:
                    lesson_title = lesson.get('title', 'Unknown') if isinstance(lesson, dict) else 'Unknown'
                logger.error(f"レッスンのNotion保存に失敗（処理は続行）: {lesson_title}, エラー: {str(e)}", exc_info=True)
        
        return LessonGenerateResponse(lessons=lessons)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"予期しないエラー: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="レッスン生成中にエラーが発生しました。しばらくしてから再度お試しください。"
        )


@router.get("/history", response_model=List[LessonOption])
async def get_lesson_history(
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """
    ユーザーの過去の記事レッスンを取得
    """
    try:
        user_email = user.get("email", "")
        lessons = notion_service.get_user_lessons(user_email, limit)
        
        # Notionから取得したデータをLessonOption形式に変換
        lesson_options = []
        for lesson in lessons:
            try:
                lesson_options.append(LessonOption(**lesson))
            except Exception as e:
                logger.warning(f"レッスンデータの変換に失敗: {e}")
                continue
        
        return lesson_options
    except Exception as e:
        logger.error(f"レッスン履歴の取得に失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail="レッスン履歴の取得に失敗しました。"
        )


