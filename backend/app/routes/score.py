from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.score_service import get_score_service, ScoreService

router = APIRouter(prefix="/score", tags=["score"])


class UpdateScoreRequest(BaseModel):
    worker_address: str
    trigger_event: str


@router.get("/{worker_address}")
async def get_score(
    worker_address: str,
    svc: ScoreService = Depends(get_score_service),
):
    try:
        return svc.get_score(worker_address)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/compute")
async def compute_and_update(
    req: UpdateScoreRequest,
    svc: ScoreService = Depends(get_score_service),
):
    try:
        return await svc.compute_and_update(req.worker_address, req.trigger_event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
