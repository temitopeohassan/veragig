from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.identity_service import get_identity_service, IdentityService

router = APIRouter(prefix="/identity", tags=["identity"])


class WhitelistRequest(BaseModel):
    account: str
    env: str = "production"


@router.post("/check")
async def check_whitelisted(
    req: WhitelistRequest,
    svc: IdentityService = Depends(get_identity_service),
):
    try:
        result = await svc.get_whitelisted_root(req.account)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{account}/expiry")
async def get_expiry(
    account: str,
    svc: IdentityService = Depends(get_identity_service),
):
    try:
        return await svc.get_expiry_data(account)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
