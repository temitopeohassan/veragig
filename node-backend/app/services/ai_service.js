const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

class AIService {
  constructor() {
    this.apiKey = config.anthropicApiKey;
    if (this.apiKey && !this.apiKey.includes('your_anthropic_api_key_here')) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
    } else {
      this.client = null;
    }
    this.model = 'claude-3-5-sonnet-20240620';
  }

  async matchTaskToWorkers(taskId, taskDescription, taskCategory, workerProfiles, topK = 10, minGoodScore = 0) {
    const eligible = workerProfiles.filter(w => (w.good_score || 0) >= minGoodScore);

    if (eligible.length === 0) {
      return { matches: [] };
    }

    if (!this.client) {
      // Mock matching logic
      const matches = eligible.slice(0, topK).map(w => ({
        worker_address: w.address,
        match_score: 0.85,
        good_score: w.good_score || 0,
        skills_matched: ['development', 'solidity'], // placeholder
      }));
      return { matches };
    }

    const workersText = eligible.slice(0, 50).map(w => 
      `- Address: ${w.address}, Score: ${w.good_score || 0}, Skills: ${(w.skills || []).join(', ')}`
    ).join('\n');

    const prompt = `You are a task-worker matching engine for Veragig, a gig marketplace on Celo.

Task ID: ${taskId}
Category: ${taskCategory}
Description: ${taskDescription}

Available workers:
${workersText}

Return a JSON array of the top ${topK} best-matched workers, ranked by fit. For each worker include:
- worker_address: string
- match_score: float (0.0–1.0)
- good_score: int
- skills_matched: array of strings from the description that match worker skills

Respond with ONLY valid JSON, no explanation.`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0].text;
      let matches = JSON.parse(content);
      if (Array.isArray(matches)) {
        matches = matches.slice(0, topK);
      }
      return { matches };
    } catch (error) {
      console.error('Error in matchTaskToWorkers:', error);
      return { matches: [] };
    }
  }

  async verifyDeliverable(taskId, taskSpec, deliverableSummary, taskCategory) {
    const prompt = `You are an AI task reviewer for Veragig, a gig marketplace.

Task ID: ${taskId}
Category: ${taskCategory}

Original Task Specification:
${taskSpec}

Submitted Deliverable Summary:
${deliverableSummary}

Evaluate whether the deliverable meets the task specification. Respond with ONLY valid JSON:
{
  "verdict": "approved" | "needs_revision" | "rejected",
  "confidence": 0.0-1.0,
  "reasoning": "plain-language explanation",
  "revision_notes": "specific improvement suggestions if needs_revision, else null"
}`;

    if (!this.client) {
      return {
        verdict: 'approved',
        confidence: 0.9,
        reasoning: 'AI verification skipped (no API key). Auto-approving for testing.',
        revision_notes: null,
      };
    }

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      return JSON.parse(message.content[0].text);
    } catch (error) {
      console.error('Error in verifyDeliverable:', error);
      return {
        verdict: 'needs_revision',
        confidence: 0.5,
        reasoning: 'Unable to parse AI response',
        revision_notes: null,
      };
    }
  }

  async generateCreditNarrative(workerAddress, goodScore, signals, loanTier) {
    const prompt = `You are a financial coach for Veragig workers. Generate a helpful, encouraging credit narrative.

Worker: ${workerAddress}
GoodScore: ${goodScore}/850
Loan Tier: ${loanTier}
Signals:
- Task Completion Rate: ${(signals.task_completion_rate * 100).toFixed(0)}%
- Earning Consistency: ${signals.earnings_consistency_weeks || 0} consecutive weeks
- Disputes Lost: ${signals.disputes_lost || 0}
- UBI Claim Streak: ${signals.ubi_claim_streak_days || 0} days
- Loans Repaid On Time: ${signals.loans_repaid_on_time || 0}

Respond with ONLY valid JSON:
{
  "narrative": "3-5 sentence personalized explanation of score",
  "top_improvement_actions": ["action1", "action2", "action3"]
}`;

    if (!this.client) {
      return {
        narrative: `Your GoodScore is ${goodScore}/850. You are making great progress in the ${loanTier} tier!`,
        top_improvement_actions: [
          'Maintain your UBI claim streak',
          'Complete more tasks with high ratings',
          'Ensure timely loan repayments',
        ],
      };
    }

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      return JSON.parse(message.content[0].text);
    } catch (error) {
      console.error('Error in generateCreditNarrative:', error);
      return {
        narrative: `Your GoodScore is ${goodScore}/850, placing you in the ${loanTier} tier.`,
        top_improvement_actions: [
          'Complete more tasks to raise your completion rate',
          'Claim your daily G$ UBI to build your claim streak',
          'Avoid disputes by communicating clearly with clients',
        ],
      };
    }
  }
}

let instance = null;
const getAIService = () => {
  if (!instance) {
    instance = new AIService();
  }
  return instance;
};

module.exports = { getAIService, AIService };
