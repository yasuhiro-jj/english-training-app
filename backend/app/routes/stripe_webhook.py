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

    logger.info(f"📩 Received Stripe event: {event_type}")

    try:
        if event_type == "customer.subscription.created":
            await stripe_service.handle_subscription_created(event_data)
        elif event_type == "customer.subscription.updated":
            await stripe_service.handle_subscription_updated(event_data)
        elif event_type == "customer.subscription.deleted":
            await stripe_service.handle_subscription_deleted(event_data)
        elif event_type == "invoice.payment_succeeded":
            await stripe_service.handle_invoice_payment_succeeded(event_data)
        else:
            logger.info(f"Unhandled event type: {event_type}")

        return {"status": "success", "event_type": event_type}
    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        # Stripeには200を返して再送を防ぐ（内部エラーでも）
        return {"status": "error", "message": str(e)}
