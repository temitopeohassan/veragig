const express = require('express');
const { Profile } = require('../models/profile');
const { verifySignedAction } = require('../services/auth_service');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Wrap verifySignedAction and translate auth failures into a 401 response.
// Returns true if the response was already sent (caller should stop).
async function rejectIfUnauthorized(res, params) {
  try {
    await verifySignedAction(params);
    return false;
  } catch (authErr) {
    const code = (authErr.message || '').startsWith('AUTH_') ? authErr.message : 'AUTH_FAILED';
    res.status(401).json({ detail: code });
    return true;
  }
}

function validateFields(res, { first_name, last_name, email }) {
  if (!first_name || !last_name || !email) {
    res.status(400).json({ detail: 'MISSING_FIELDS' });
    return false;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ detail: 'INVALID_EMAIL' });
    return false;
  }
  return true;
}

// Fetch a profile (also used by the frontend to gate the create-profile modal).
router.get('/:address', async (req, res) => {
  try {
    const profile = await Profile.findByPk(req.params.address);
    if (!profile) {
      return res.status(404).json({ detail: 'PROFILE_NOT_FOUND' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a profile. The wallet must already have signed Account.createAccount()
// on-chain (account_tx_hash) and prove ownership via a signed message.
router.post('/', async (req, res) => {
  try {
    const { address, first_name, last_name, email, account_tx_hash, signature, issued_at, nonce } = req.body;

    if (!address) {
      return res.status(400).json({ detail: 'MISSING_ADDRESS' });
    }
    if (await rejectIfUnauthorized(res, {
      action: 'create-profile', subject: address, address,
      issuedAt: issued_at, nonce, signature,
    })) return;

    if (!validateFields(res, { first_name, last_name, email })) return;

    const existing = await Profile.findByPk(address);
    if (existing) {
      return res.status(409).json({ detail: 'PROFILE_EXISTS' });
    }

    const profile = await Profile.create({
      address, first_name, last_name, email, account_tx_hash,
    });
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update an existing profile (first/last/email) in the database.
router.put('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { first_name, last_name, email, signature, issued_at, nonce } = req.body;

    if (await rejectIfUnauthorized(res, {
      action: 'update-profile', subject: address, address,
      issuedAt: issued_at, nonce, signature,
    })) return;

    if (!validateFields(res, { first_name, last_name, email })) return;

    const existing = await Profile.findByPk(address);
    if (!existing) {
      return res.status(404).json({ detail: 'PROFILE_NOT_FOUND' });
    }

    const profile = await Profile.update(address, { first_name, last_name, email });
    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
