"""Diagram: external webhooks — OTP, eKYC, AML. Implement handlers + signature verify here."""

from fastapi import APIRouter, Header, HTTPException, status

router = APIRouter(prefix="/integrations", tags=["external-services"])


@router.post("/webhooks/ekyc-demo")
def ekyc_webhook_demo(
    x_signature: str | None = Header(None, alias="X-BidZone-Signature"),
) -> dict[str, str]:
    """Provider posts job results; verify `x_signature` against `WEBHOOK_SIGNING_SECRET`."""
    if not x_signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing signature header.")
    return {"status": "received", "detail": "Verify HMAC body with your provider; not implemented."}
