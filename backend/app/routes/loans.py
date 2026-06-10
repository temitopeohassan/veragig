from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.loan_service import get_loan_service, LoanService

router = APIRouter(prefix="/loans", tags=["loans"])


class RepaymentRequest(BaseModel):
    loan_id: str
    worker_address: str
    payout_amount_wei: str
    repayment_pct: int


@router.get("/{worker_address}/eligibility")
async def check_eligibility(
    worker_address: str,
    svc: LoanService = Depends(get_loan_service),
):
    try:
        return svc.check_eligibility(worker_address)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repay")
async def auto_repay(
    req: RepaymentRequest,
    svc: LoanService = Depends(get_loan_service),
):
    try:
        result = await svc.process_auto_repayment(
            req.loan_id,
            req.worker_address,
            int(req.payout_amount_wei),
            req.repayment_pct,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
