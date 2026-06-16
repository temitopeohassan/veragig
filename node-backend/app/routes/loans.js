const express = require('express');
const { getLoanService } = require('../services/loan_service');

const router = express.Router();

router.get('/:worker_address/eligibility', async (req, res) => {
  try {
    const svc = getLoanService();
    const result = await svc.checkEligibility(req.params.worker_address);
    res.json(result);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(400).json({ detail: error.message });
  }
});

router.post('/repay', async (req, res) => {
  try {
    const { loan_id, worker_address, payout_amount_wei, repayment_pct } = req.body;
    const svc = getLoanService();
    const result = await svc.processAutoRepayment(
      loan_id,
      worker_address,
      payout_amount_wei,
      repayment_pct
    );
    res.json(result);
  } catch (error) {
    console.error('Error processing repayment:', error);
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
