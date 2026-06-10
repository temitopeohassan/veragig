from sqlalchemy import Column, String, Integer, Boolean, BigInteger, Text, DateTime, Enum
from sqlalchemy.sql import func
import enum
from app.database import Base


class TaskStatus(str, enum.Enum):
    open = "open"
    assigned = "assigned"
    submitted = "submitted"
    completed = "completed"
    disputed = "disputed"
    cancelled = "cancelled"


class TaskCategory(str, enum.Enum):
    design = "design"
    development = "development"
    writing = "writing"
    marketing = "marketing"
    data = "data"
    video = "video"
    audio = "audio"
    other = "other"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(66), primary_key=True)  # bytes32 hex
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(20), nullable=False)
    reward_wei = Column(BigInteger, nullable=False)
    deadline_unix = Column(BigInteger, nullable=False)
    client_address = Column(String(42), nullable=False)
    worker_address = Column(String(42), nullable=True)
    status = Column(String(20), default="open")
    deliverable_cid = Column(String(255), nullable=True)
    rating = Column(Integer, nullable=True)
    release_as_stream = Column(Boolean, default=True)
    payout_duration_days = Column(Integer, default=7)
    escrow_tx_hash = Column(String(66), nullable=True)
    milestones = Column(Text, nullable=True)  # JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TaskApplication(Base):
    __tablename__ = "task_applications"

    id = Column(String(66), primary_key=True)
    task_id = Column(String(66), nullable=False)
    worker_address = Column(String(42), nullable=False)
    proposal = Column(Text, nullable=False)
    estimated_days = Column(Integer, nullable=True)
    good_score_at_application = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
