const express = require('express');
const { getAIService } = require('../services/ai_service');

const router = express.Router();

router.post('/match', async (req, res) => {
  try {
    const { task_id, task_description, task_category, top_k, min_good_score, worker_profiles } = req.body;
    const svc = getAIService();
    const result = await svc.matchTaskToWorkers(
      task_id,
      task_description,
      task_category,
      worker_profiles || [],
      top_k,
      min_good_score
    );
    res.json(result);
  } catch (error) {
    console.error('Error matching task:', error);
    res.status(500).json({ detail: error.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { task_id, task_spec, deliverable_summary, task_category } = req.body;
    const svc = getAIService();
    const result = await svc.verifyDeliverable(
      task_id,
      task_spec,
      deliverable_summary,
      task_category
    );
    res.json(result);
  } catch (error) {
    console.error('Error verifying deliverable:', error);
    res.status(500).json({ detail: error.message });
  }
});

router.post('/credit-narrative', async (req, res) => {
  try {
    const { worker_address, good_score, signals, loan_tier } = req.body;
    const svc = getAIService();
    const result = await svc.generateCreditNarrative(
      worker_address,
      good_score,
      signals,
      loan_tier
    );
    res.json(result);
  } catch (error) {
    console.error('Error generating credit narrative:', error);
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
