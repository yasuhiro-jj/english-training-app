from fastapi import APIRouter, Request, HTTPException
from app.services.stripe_service import StripeService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

stripe_service = StripeService()


@router.get("/stripe")
async def stripe_webhook_health():
    """
    Stripe Webhook エンドポイントの疎通確認用
    """
    return {"status": "ok", "message": "Stripe webhook endpoint is ready"}


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """
    Stripe Webhook エンドポイント
    
    受け取るイベント:
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    
    重要: このエンドポイントは認証不要（Stripe署名検証のみ）
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        logger.warning("Missing stripe-signature header")
        raise HTTPException(status_code=400, detail="Missing signature")

    # Webhook署名検証 & イベント構築
    event = stripe_service.construct_event(payload, sig_header)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid signature or payload")

    event_type = event.get("type")
    event_data = event.get("data", {}).get("object", {})
    event_id = event.get("id")
    livemode = event.get("livemode")

    logger.info(f"📩 Received Stripe event: id={event_id}, type={event_type}, livemode={livemode}")

    try:
        ok = True
        if event_type == "customer.subscription.created":
            ok = await stripe_service.handle_subscription_created(event_data)
        elif event_type == "customer.subscription.updated":
            ok = await stripe_service.handle_subscription_updated(event_data)
        elif event_type == "customer.subscription.deleted":
            ok = await stripe_service.handle_subscription_deleted(event_data)
        elif event_type == "invoice.payment_succeeded":
            ok = await stripe_service.handle_invoice_payment_succeeded(event_data)
        else:
            logger.info(f"Unhandled event type: {event_type}")

        if ok is False:
            logger.error(
                f"Webhook handler returned False. type={event_type}, id={event_id}"
            )
            raise HTTPException(status_code=500, detail="Webhook handler failed")

        return {"status": "success", "event_type": event_type}
    except Exception as e:
        logger.exception(f"Error processing webhook type={event_type}, id={event_id}: {e}")
        # 失敗時は非2xxを返してStripeの自動リトライ/手動再送が効くようにする
        raise HTTPException(status_code=500, detail="Webhook processing failed")
