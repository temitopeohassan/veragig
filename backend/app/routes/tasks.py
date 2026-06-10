from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.task import Task, TaskApplication
from app.services.identity_service import get_identity_service, IdentityService
from app.services.score_service import get_score_service, ScoreService
import uuid, json

router = APIRouter(prefix="/tasks", tags=["tasks"])


class CreateTaskRequest(BaseModel):
    task_id: str
    title: str
    description: str
    category: str
    reward_wei: str
    deadline_unix: int
    client_address: str
    release_as_stream: bool = True
    payout_duration_days: int = 7
    milestones: Optional[list] = None
    escrow_tx_hash: Optional[str] = None


class ApplyTaskRequest(BaseModel):
    task_id: str
    worker_address: str
    proposal: str
    estimated_days: Optional[int] = None


class SubmitDeliverableRequest(BaseModel):
    task_id: str
    worker_address: str
    deliverable_cid: str
    notes: Optional[str] = None
    milestone_index: Optional[int] = None


@router.post("/")
async def create_task(
    req: CreateTaskRequest,
    db: AsyncSession = Depends(get_db),
    identity_svc: IdentityService = Depends(get_identity_service),
):
    identity = await identity_svc.get_whitelisted_root(req.client_address)
    if not identity["is_whitelisted"]:
        raise HTTPException(status_code=403, detail="IDENTITY_NOT_VERIFIED")

    task = Task(
        id=req.task_id,
        title=req.title,
        description=req.description,
        category=req.category,
        reward_wei=int(req.reward_wei),
        deadline_unix=req.deadline_unix,
        client_address=req.client_address.lower(),
        status="open",
        release_as_stream=req.release_as_stream,
        payout_duration_days=req.payout_duration_days,
        milestones=json.dumps(req.milestones) if req.milestones else None,
        escrow_tx_hash=req.escrow_tx_hash,
    )
    db.add(task)
    await db.commit()
    return {"task_id": req.task_id, "status": "open"}


@router.get("/")
async def list_tasks(
    status: Optional[str] = "open",
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Task)
    if status:
        query = query.where(Task.status == status)
    if category:
        query = query.where(Task.category == category)
    result = await db.execute(query)
    tasks = result.scalars().all()
    return [
        {
            "task_id": t.id,
            "title": t.title,
            "category": t.category,
            "reward_wei": str(t.reward_wei),
            "deadline_unix": t.deadline_unix,
            "client_address": t.client_address,
            "status": t.status,
        }
        for t in tasks
    ]


@router.get("/{task_id}")
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/apply")
async def apply_to_task(
    req: ApplyTaskRequest,
    db: AsyncSession = Depends(get_db),
    identity_svc: IdentityService = Depends(get_identity_service),
    score_svc: ScoreService = Depends(get_score_service),
):
    identity = await identity_svc.get_whitelisted_root(req.worker_address)
    if not identity["is_whitelisted"]:
        raise HTTPException(status_code=403, detail="IDENTITY_NOT_VERIFIED")

    score_data = score_svc.get_score(req.worker_address)
    app_id = "0x" + uuid.uuid4().hex

    application = TaskApplication(
        id=app_id,
        task_id=req.task_id,
        worker_address=req.worker_address.lower(),
        proposal=req.proposal,
        estimated_days=req.estimated_days,
        good_score_at_application=score_data["good_score"],
    )
    db.add(application)
    await db.commit()

    return {"application_id": app_id, "good_score_at_application": score_data["good_score"]}


@router.post("/submit")
async def submit_deliverable(
    req: SubmitDeliverableRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == req.task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.worker_address and task.worker_address.lower() != req.worker_address.lower():
        raise HTTPException(status_code=403, detail="Not the assigned worker")
    if task.status != "assigned":
        raise HTTPException(status_code=400, detail="TASK_NOT_ASSIGNED")

    task.deliverable_cid = req.deliverable_cid
    task.status = "submitted"
    await db.commit()

    submission_id = "0x" + uuid.uuid4().hex
    return {
        "submission_id": submission_id,
        "on_chain_tx": None,
        "ai_review_triggered": True,
    }
