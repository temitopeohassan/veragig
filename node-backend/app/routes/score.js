const express = require('express');
const { getScoreService } = require('../services/score_service');

const router = express.Router();

router.get('/:worker_address', async (req, res) => {
  try {
    const svc = getScoreService();
    const result = await svc.getScore(req.params.worker_address);
    res.json(result);
  } catch (error) {
    console.error('Error getting score:', error);
    res.status(400).json({ detail: error.message });
  }
});

router.post('/compute', async (req, res) => {
  try {
    const { worker_address, trigger_event } = req.body;
    const svc = getScoreService();
    const result = await svc.computeAndUpdate(worker_address, trigger_event);
    res.json(result);
  } catch (error) {
    console.error('Error computing score:', error);
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
