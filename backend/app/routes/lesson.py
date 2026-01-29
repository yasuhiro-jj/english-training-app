from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import LessonGenerateRequest, LessonGenerateResponse, LessonOption
from app.services import AIService, NewsService, NotionService
from app.deps import get_current_user
import logging
from typing import List, Dict
from datetime import datetime

router = APIRouter(prefix="/api/lesson", tags=["lesson"])

# サービスのインスタンス化
ai_service = AIService()
news_service = NewsService()
notion_service = NotionService()

logger = logging.getLogger(__name__)


@router.post("/generate", response_model=LessonGenerateResponse)
async def generate_lesson(
    request: LessonGenerateRequest,
    user: dict = Depends(get_current_user)
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
            detail=f"レッスン生成中にエラーが発生しました: {str(e)}"
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
            detail=f"レッスン履歴の取得に失敗しました: {str(e)}"
        )


@router.get("/debug/notion-config")
async def debug_notion_config(user: dict = Depends(get_current_user)):
    """
    デバッグ用: Notion設定の確認（認証必要）
    """
    import os
    from app.services.notion_service import NotionService
    
    notion_service = NotionService()
    
    return {
        "lessons_db_id_configured": bool(notion_service.lessons_db_id),
        "lessons_db_id_value": notion_service.lessons_db_id[:20] + "..." if notion_service.lessons_db_id else None,
        "notion_token_configured": bool(os.getenv("NOTION_TOKEN")),
        "user_email": user.get("email", ""),
    }


@router.get("/debug/notion-config/public")
async def debug_notion_config_public():
    """
    デバッグ用: Notion設定の確認（認証不要・公開エンドポイント）
    注意: 本番環境では削除または認証を追加してください
    """
    import os
    from app.services.notion_service import NotionService
    
    notion_service = NotionService()
    
    return {
        "lessons_db_id_configured": bool(notion_service.lessons_db_id),
        "lessons_db_id_value": notion_service.lessons_db_id[:20] + "..." if notion_service.lessons_db_id else None,
        "lessons_db_id_full": notion_service.lessons_db_id if notion_service.lessons_db_id else None,
        "notion_token_configured": bool(os.getenv("NOTION_TOKEN")),
        "notion_token_length": len(os.getenv("NOTION_TOKEN", "")),
    }


@router.post("/debug/test-notion-save")
async def test_notion_save(user: dict = Depends(get_current_user)):
    """
    デバッグ用: Notionへの保存をテスト（認証必要）
    実際にテストデータをNotionに保存して動作確認
    """
    from app.services.notion_service import NotionService
    
    notion_service = NotionService()
    user_email = user.get("email", "")
    
    # テスト用のレッスンデータ
    test_lesson = {
        "title": f"Test Lesson - {datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "date": datetime.now().isoformat(),
        "category": "Test",
        "level": "B1",
        "content": "This is a test lesson content.",
        "vocabulary": [],
        "discussion_a": ["Test question 1"],
        "discussion_b": ["Test question 2"],
        "question": "What is this test about?",
        "japanese_title": "テスト記事"
    }
    
    try:
        logger.info(f"Testing Notion save with test lesson: {test_lesson['title']}")
        page_id = notion_service.save_lesson(test_lesson, user_email)
        
        if page_id:
            return {
                "success": True,
                "message": "テストデータがNotionに正常に保存されました",
                "page_id": page_id,
                "test_lesson": test_lesson
            }
        else:
            return {
                "success": False,
                "message": "Notionへの保存が失敗しました（page_idがNone）",
                "test_lesson": test_lesson
            }
    except Exception as e:
        logger.error(f"Test Notion save failed: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"エラーが発生しました: {str(e)}",
            "error_type": type(e).__name__,
            "test_lesson": test_lesson
        }
