const express = require('express');
const { getIdentityService } = require('../services/identity_service');

const router = express.Router();

router.post('/check', async (req, res) => {
  try {
    const { account } = req.body;
    const svc = getIdentityService();
    const result = await svc.getWhitelistedRoot(account);
    res.json(result);
  } catch (error) {
    console.error('Error checking whitelist:', error);
    res.status(400).json({ detail: error.message });
  }
});

router.get('/:account/expiry', async (req, res) => {
  try {
    const svc = getIdentityService();
    const result = await svc.getExpiryData(req.params.account);
    res.json(result);
  } catch (error) {
    console.error('Error getting expiry:', error);
    res.status(400).json({ detail: error.message });
  }
});

module.exports = router;
