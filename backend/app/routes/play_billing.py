import base64
import hmac
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.deps import get_current_user
from app.services.google_play_service import GooglePlayService, PlayPurchaseError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["play-billing"])

play_service = GooglePlayService()


class PlayVerifyRequest(BaseModel):
    product_id: str = Field(..., min_length=1, max_length=200)
    purchase_token: str = Field(..., min_length=1, max_length=2000)


@router.post("/api/play/verify")
async def verify_play_purchase(
    body: PlayVerifyRequest, current_user: dict = Depends(get_current_user)
):
    """
    アプリ(TWA)で購入した定期購入を検証し、ログイン中ユーザーのサブスクに反映する。
    """
    if not play_service.is_configured():
        raise HTTPException(status_code=503, detail="Google Play billing is not configured")
    try:
        result = await play_service.verify_and_apply(
            email=current_user["email"],
            product_id=body.product_id,
            purchase_token=body.purchase_token,
        )
    except PlayPurchaseError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    return {"status": "success", **result}


@router.post("/api/webhooks/play")
async def play_rtdn(request: Request):
    """
    Google Play のリアルタイム デベロッパー通知（Cloud Pub/Sub の push）。

    Pub/Sub の push サブスクリプションのエンドポイントURLに
    ?token=<GOOGLE_PLAY_RTDN_SECRET> を付けて登録し、その値で呼び出し元を確認する。
    """
    secret = play_service.rtdn_secret
    supplied = request.query_params.get("token", "")
    if not secret or not hmac.compare_digest(secret, supplied):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        envelope = await request.json()
        data = envelope["message"]["data"]
        notification = json.loads(base64.b64decode(data).decode("utf-8"))
    except Exception:
        # 形式が不正なものは再送しても直らないため 2xx で捨てる
        logger.warning("Invalid RTDN payload")
        return {"status": "ignored"}

    if notification.get("packageName") != play_service.package_name:
        return {"status": "ignored"}

    sub_note = notification.get("subscriptionNotification")
    if not sub_note:
        # testNotification / oneTimeProduct など
        logger.info(f"RTDN without subscription payload: keys={list(notification.keys())}")
        return {"status": "ignored"}

    try:
        ok = await play_service.handle_rtdn_subscription(sub_note["purchaseToken"])
    except PlayPurchaseError as e:
        logger.error(f"RTDN processing error: {e}")
        raise HTTPException(status_code=500, detail="RTDN processing failed")
    if not ok:
        # 非2xxを返して Pub/Sub の再送に任せる
        raise HTTPException(status_code=500, detail="RTDN processing failed")
    return {"status": "success"}
