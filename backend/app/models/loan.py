from sqlalchemy import Column, String, Integer, Boolean, BigInteger, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Loan(Base):
    __tablename__ = "loans"

    id = Column(String(66), primary_key=True)  # bytes32 loan ID
    worker_address = Column(String(42), nullable=False, index=True)
    principal_wei = Column(BigInteger, nullable=False)
    remaining_wei = Column(BigInteger, nullable=False)
    repayment_deduction_pct = Column(Integer, nullable=False)
    purpose = Column(String(50), nullable=False)
    stream_tx = Column(String(66), nullable=True)
    fully_repaid = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    repaid_at = Column(DateTime(timezone=True), nullable=True)
