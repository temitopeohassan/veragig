from sqlalchemy import Column, String, Integer, Boolean, BigInteger, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Worker(Base):
    __tablename__ = "workers"

    address = Column(String(42), primary_key=True)
    is_verified = Column(Boolean, default=False)
    good_score = Column(Integer, default=0)
    loan_tier = Column(String(20), default="none")
    tasks_completed = Column(Integer, default=0)
    tasks_accepted = Column(Integer, default=0)
    disputes_lost = Column(Integer, default=0)
    loans_repaid_on_time = Column(Integer, default=0)
    ubi_claim_streak_days = Column(Integer, default=0)
    earning_consistency_weeks = Column(Integer, default=0)
    total_earned_wei = Column(BigInteger, default=0)
    identity_expiry_unix = Column(BigInteger, default=0)
    last_score_update_block = Column(BigInteger, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
