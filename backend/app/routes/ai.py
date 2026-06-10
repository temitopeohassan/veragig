from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.ai_service import get_ai_service, AIService

router = APIRouter(prefix="/ai", tags=["ai"])


class TaskMatchRequest(BaseModel):
    task_id: str
    task_description: str
    task_category: str
    top_k: int = 10
    min_good_score: int = 0
    worker_profiles: list[dict] = []


class VerifyDeliverableRequest(BaseModel):
    task_id: str
    task_spec: str
    deliverable_summary: str
    task_category: str


class CreditNarrativeRequest(BaseModel):
    worker_address: str
    good_score: int
    signals: dict
    loan_tier: str = "none"


@router.post("/match")
async def match_task(
    req: TaskMatchRequest,
    svc: AIService = Depends(get_ai_service),
):
    try:
        return await svc.match_task_to_workers(
            req.task_id,
            req.task_description,
            req.task_category,
            req.worker_profiles,
            req.top_k,
            req.min_good_score,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify")
async def verify_deliverable(
    req: VerifyDeliverableRequest,
    svc: AIService = Depends(get_ai_service),
):
    try:
        return await svc.verify_deliverable(
            req.task_id,
            req.task_spec,
            req.deliverable_summary,
            req.task_category,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credit-narrative")
async def credit_narrative(
    req: CreditNarrativeRequest,
    svc: AIService = Depends(get_ai_service),
):
    try:
        return await svc.generate_credit_narrative(
            req.worker_address,
            req.good_score,
            req.signals,
            req.loan_tier,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
