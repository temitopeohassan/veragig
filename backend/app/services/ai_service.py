import anthropic
from app.config import get_settings

settings = get_settings()


class AIService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-6"

    async def match_task_to_workers(
        self,
        task_id: str,
        task_description: str,
        task_category: str,
        worker_profiles: list[dict],
        top_k: int = 10,
        min_good_score: int = 0,
    ) -> dict:
        eligible = [w for w in worker_profiles if w.get("good_score", 0) >= min_good_score]

        if not eligible:
            return {"matches": []}

        workers_text = "\n".join([
            f"- Address: {w['address']}, Score: {w.get('good_score', 0)}, Skills: {', '.join(w.get('skills', []))}"
            for w in eligible[:50]
        ])

        prompt = f"""You are a task-worker matching engine for GoodFlow, a gig marketplace on Celo.

Task ID: {task_id}
Category: {task_category}
Description: {task_description}

Available workers:
{workers_text}

Return a JSON array of the top {top_k} best-matched workers, ranked by fit. For each worker include:
- worker_address: string
- match_score: float (0.0–1.0)
- good_score: int
- skills_matched: array of strings from the description that match worker skills

Respond with ONLY valid JSON, no explanation."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        try:
            matches = json.loads(message.content[0].text)
            if isinstance(matches, list):
                matches = matches[:top_k]
            return {"matches": matches}
        except Exception:
            return {"matches": []}

    async def verify_deliverable(
        self,
        task_id: str,
        task_spec: str,
        deliverable_summary: str,
        task_category: str,
    ) -> dict:
        prompt = f"""You are an AI task reviewer for GoodFlow, a gig marketplace.

Task ID: {task_id}
Category: {task_category}

Original Task Specification:
{task_spec}

Submitted Deliverable Summary:
{deliverable_summary}

Evaluate whether the deliverable meets the task specification. Respond with ONLY valid JSON:
{{
  "verdict": "approved" | "needs_revision" | "rejected",
  "confidence": 0.0-1.0,
  "reasoning": "plain-language explanation",
  "revision_notes": "specific improvement suggestions if needs_revision, else null"
}}"""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        try:
            result = json.loads(message.content[0].text)
            return result
        except Exception:
            return {
                "verdict": "needs_revision",
                "confidence": 0.5,
                "reasoning": "Unable to parse AI response",
                "revision_notes": None,
            }

    async def generate_credit_narrative(
        self,
        worker_address: str,
        good_score: int,
        signals: dict,
        loan_tier: str,
    ) -> dict:
        prompt = f"""You are a financial coach for GoodFlow workers. Generate a helpful, encouraging credit narrative.

Worker: {worker_address}
GoodScore: {good_score}/850
Loan Tier: {loan_tier}
Signals:
- Task Completion Rate: {signals.get('task_completion_rate', 0):.0%}
- Earning Consistency: {signals.get('earnings_consistency_weeks', 0)} consecutive weeks
- Disputes Lost: {signals.get('disputes_lost', 0)}
- UBI Claim Streak: {signals.get('ubi_claim_streak_days', 0)} days
- Loans Repaid On Time: {signals.get('loans_repaid_on_time', 0)}

Respond with ONLY valid JSON:
{{
  "narrative": "3-5 sentence personalized explanation of score",
  "top_improvement_actions": ["action1", "action2", "action3"]
}}"""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        try:
            return json.loads(message.content[0].text)
        except Exception:
            return {
                "narrative": f"Your GoodScore is {good_score}/850, placing you in the {loan_tier} tier.",
                "top_improvement_actions": [
                    "Complete more tasks to raise your completion rate",
                    "Claim your daily G$ UBI to build your claim streak",
                    "Avoid disputes by communicating clearly with clients",
                ],
            }


_ai_service = None


def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
