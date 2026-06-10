from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import identity, tasks, score, loans, ai

app = FastAPI(
    title="GoodFlow API",
    description="Backend for the GoodFlow gig marketplace on GoodDollar × Celo",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://goodflow.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(identity.router)
app.include_router(tasks.router)
app.include_router(score.router)
app.include_router(loans.router)
app.include_router(ai.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "goodflow-api"}
