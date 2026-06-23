const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Task, TaskApplication, TaskSubmission } = require('../models/task');
const { getIdentityService } = require('../services/identity_service');
const { getScoreService } = require('../services/score_service');
const { getEscrowService } = require('../services/escrow_service');
const { verifySignedAction } = require('../services/auth_service');
const config = require('../config');

const router = express.Router();

const TASK_TYPES = ['gig', 'bounty'];

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

router.post('/', async (req, res) => {
  try {
    const {
      task_id, title, description, category, reward_wei,
      deadline_unix, client_address, release_as_stream,
      payout_duration_days, milestones, signature, issued_at, nonce,
      token, task_type,
    } = req.body;

    // Prove the caller owns client_address before relaying any funds.
    if (await rejectIfUnauthorized(res, {
      action: 'create-task', subject: task_id, address: client_address,
      issuedAt: issued_at, nonce, signature,
    })) return;

    // Resolve and validate the reward token against the on-chain whitelist.
    const tokenInfo = config.resolveToken(token);
    if (!tokenInfo) {
      return res.status(400).json({ detail: 'TOKEN_NOT_ALLOWED' });
    }

    // Default to gig for backward compatibility.
    const taskType = task_type ? String(task_type).toLowerCase() : 'gig';
    if (!TASK_TYPES.includes(taskType)) {
      return res.status(400).json({ detail: 'INVALID_TASK_TYPE' });
    }

    const identitySvc = getIdentityService();
    const identity = await identitySvc.getWhitelistedRoot(client_address);
    if (!identity.is_whitelisted) {
      return res.status(403).json({ detail: 'IDENTITY_NOT_VERIFIED' });
    }

    const releaseAsStream = release_as_stream !== undefined ? release_as_stream : true;
    const payoutDays = payout_duration_days || 7;

    // Relay the on-chain createTask through the trusted relayer. The client must have
    // already approved the escrow contract for reward + 2% fee of the token from their wallet.
    let escrowTxHash;
    try {
      escrowTxHash = await getEscrowService().createTask({
        taskId: task_id,
        client: client_address,
        token: tokenInfo.address,
        rewardWei: reward_wei.toString(),
        deadlineUnix: Number(deadline_unix),
        taskType,
      });
    } catch (relayErr) {
      console.error('Relayer createTask failed:', relayErr);
      const status = relayErr.message === 'RELAYER_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ detail: 'ESCROW_RELAY_FAILED', error: relayErr.message });
    }

    await Task.create({
      id: task_id,
      title,
      description,
      category,
      reward_wei: reward_wei.toString(), // Store as string for Firestore
      token_address: tokenInfo.address,
      token_symbol: tokenInfo.symbol,
      token_decimals: tokenInfo.decimals,
      task_type: taskType,
      deadline_unix: Number(deadline_unix),
      client_address: client_address.toLowerCase(),
      status: 'open',
      release_as_stream: releaseAsStream,
      payout_duration_days: payoutDays,
      milestones: milestones ? JSON.stringify(milestones) : null,
      escrow_tx_hash: escrowTxHash,
    });

    res.json({ task_id, status: 'open', task_type: taskType, token: tokenInfo.symbol, escrow_tx_hash: escrowTxHash });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status = 'open', category } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const tasks = await Task.findAll({ where });
    res.json(tasks.map(t => ({
      task_id: t.id,
      title: t.title,
      category: t.category,
      reward_wei: t.reward_wei,
      token_symbol: t.token_symbol || 'G$',
      token_decimals: t.token_decimals != null ? t.token_decimals : 18,
      task_type: t.task_type || 'gig',
      deadline_unix: Number(t.deadline_unix),
      client_address: t.client_address,
      status: t.status,
    })));
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:task_id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.task_id);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    // Remove the save function from the response
    const { save, ...taskData } = task;
    res.json(taskData);
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/apply', async (req, res) => {
  try {
    const { task_id, worker_address, proposal, estimated_days } = req.body;

    const identitySvc = getIdentityService();
    const identity = await identitySvc.getWhitelistedRoot(worker_address);
    if (!identity.is_whitelisted) {
      return res.status(403).json({ detail: 'IDENTITY_NOT_VERIFIED' });
    }

    const scoreSvc = getScoreService();
    const scoreData = await scoreSvc.getScore(worker_address);
    const appId = '0x' + uuidv4().replace(/-/g, '');

    await TaskApplication.create({
      id: appId,
      task_id,
      worker_address: worker_address.toLowerCase(),
      proposal,
      estimated_days: estimated_days ? Number(estimated_days) : null,
      good_score_at_application: scoreData.good_score,
    });

    res.json({ application_id: appId, good_score_at_application: scoreData.good_score });
  } catch (error) {
    console.error('Error applying to task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { task_id, worker_address, deliverable_cid, notes, milestone_index } = req.body;
    if (!worker_address) {
      return res.status(400).json({ detail: 'MISSING_WORKER' });
    }

    const task = await Task.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    // Bounty: any identity-verified worker may submit (and resubmit), no assignment.
    if ((task.task_type || 'gig') === 'bounty') {
      if (task.status !== 'open') {
        return res.status(400).json({ detail: 'BOUNTY_NOT_OPEN' });
      }
      const identitySvc = getIdentityService();
      const identity = await identitySvc.getWhitelistedRoot(worker_address);
      if (!identity.is_whitelisted) {
        return res.status(403).json({ detail: 'IDENTITY_NOT_VERIFIED' });
      }
      const submission = await TaskSubmission.upsert({
        task_id, worker_address, deliverable_cid, notes,
      });
      return res.json({
        submission_id: submission.id,
        on_chain_tx: null,
        ai_review_triggered: true,
      });
    }

    // Gig: only the single assigned worker, in the assigned state.
    if (task.worker_address && task.worker_address.toLowerCase() !== worker_address.toLowerCase()) {
      return res.status(403).json({ detail: 'Not the assigned worker' });
    }
    if (task.status !== 'assigned') {
      return res.status(400).json({ detail: 'TASK_NOT_ASSIGNED' });
    }

    task.deliverable_cid = deliverable_cid;
    task.status = 'submitted';
    await task.save();

    const submissionId = '0x' + uuidv4().replace(/-/g, '');
    res.json({
      submission_id: submissionId,
      on_chain_tx: null,
      ai_review_triggered: true,
    });
  } catch (error) {
    console.error('Error submitting deliverable:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List all submissions for a bounty (used by the client's winner-selection page).
router.get('/:task_id/submissions', async (req, res) => {
  try {
    const submissions = await TaskSubmission.findByTask(req.params.task_id);
    res.json(submissions);
  } catch (error) {
    console.error('Error listing submissions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Select bounty winners and split the escrowed reward equally between them (relayed).
router.post('/select-winners', async (req, res) => {
  try {
    const { task_id, client_address, submission_ids, rating, signature, issued_at, nonce } = req.body;

    if (await rejectIfUnauthorized(res, {
      action: 'select-winners', subject: task_id, address: client_address,
      issuedAt: issued_at, nonce, signature,
    })) return;

    if (!Array.isArray(submission_ids) || submission_ids.length === 0) {
      return res.status(400).json({ detail: 'NO_WINNERS_SELECTED' });
    }

    const task = await Task.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    if ((task.task_type || 'gig') !== 'bounty') {
      return res.status(400).json({ detail: 'NOT_A_BOUNTY' });
    }
    if (task.client_address.toLowerCase() !== (client_address || '').toLowerCase()) {
      return res.status(403).json({ detail: 'NOT_TASK_CLIENT' });
    }
    if (task.status !== 'open') {
      return res.status(400).json({ detail: 'BOUNTY_NOT_OPEN' });
    }

    // Map selected submission ids -> winner addresses (deduped, preserving order).
    const allSubmissions = await TaskSubmission.findByTask(task_id);
    const byId = new Map(allSubmissions.map((s) => [s.id, s]));
    const winners = [];
    const seen = new Set();
    for (const sid of submission_ids) {
      const sub = byId.get(sid);
      if (!sub) {
        return res.status(400).json({ detail: 'UNKNOWN_SUBMISSION', submission_id: sid });
      }
      const addr = sub.worker_address.toLowerCase();
      if (!seen.has(addr)) {
        seen.add(addr);
        winners.push(sub.worker_address);
      }
    }

    const ratingValue = Number(rating) || 5;
    let txHash;
    try {
      txHash = await getEscrowService().approveBountyWinners({
        taskId: task_id,
        client: task.client_address,
        winners,
        rating: ratingValue,
      });
    } catch (relayErr) {
      console.error('Relayer approveBountyWinners failed:', relayErr);
      const status = relayErr.message === 'RELAYER_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ detail: 'ESCROW_RELAY_FAILED', error: relayErr.message });
    }

    // Mark submissions accepted/rejected and complete the task.
    const selectedIds = new Set(submission_ids);
    await Promise.all(
      allSubmissions.map((s) =>
        TaskSubmission.setStatus(s.id, selectedIds.has(s.id) ? 'accepted' : 'rejected')
      )
    );
    task.status = 'completed';
    task.rating = ratingValue;
    await task.save();

    // Recompute each winner's VeraScore (best-effort; don't fail the request).
    const scoreSvc = getScoreService();
    await Promise.allSettled(
      winners.map((w) => scoreSvc.computeAndUpdate(w, 'bounty_won'))
    );

    res.json({ task_id, status: 'completed', winners, settle_tx: txHash });
  } catch (error) {
    console.error('Error selecting winners:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Approve a submitted task and release the reward to the worker (relayed on-chain).
router.post('/approve', async (req, res) => {
  try {
    const { task_id, client_address, rating, signature, issued_at, nonce } = req.body;

    if (await rejectIfUnauthorized(res, {
      action: 'approve-task', subject: task_id, address: client_address,
      issuedAt: issued_at, nonce, signature,
    })) return;

    const task = await Task.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    if (task.client_address.toLowerCase() !== (client_address || '').toLowerCase()) {
      return res.status(403).json({ detail: 'NOT_TASK_CLIENT' });
    }
    if (task.status !== 'submitted') {
      return res.status(400).json({ detail: 'TASK_NOT_SUBMITTED' });
    }

    let txHash;
    try {
      txHash = await getEscrowService().approveAndRelease({
        taskId: task_id,
        client: task.client_address,
        rating: Number(rating),
      });
    } catch (relayErr) {
      console.error('Relayer approveAndRelease failed:', relayErr);
      const status = relayErr.message === 'RELAYER_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ detail: 'ESCROW_RELAY_FAILED', error: relayErr.message });
    }

    task.status = 'completed';
    task.rating = Number(rating);
    await task.save();

    res.json({ task_id, status: 'completed', release_tx: txHash });
  } catch (error) {
    console.error('Error approving task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Cancel an open task and refund the client (relayed on-chain).
router.post('/cancel', async (req, res) => {
  try {
    const { task_id, client_address, signature, issued_at, nonce } = req.body;

    if (await rejectIfUnauthorized(res, {
      action: 'cancel-task', subject: task_id, address: client_address,
      issuedAt: issued_at, nonce, signature,
    })) return;

    const task = await Task.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ detail: 'Task not found' });
    }
    if (task.client_address.toLowerCase() !== (client_address || '').toLowerCase()) {
      return res.status(403).json({ detail: 'NOT_TASK_CLIENT' });
    }
    if (task.status !== 'open') {
      return res.status(400).json({ detail: 'TASK_NOT_OPEN' });
    }

    let txHash;
    try {
      txHash = await getEscrowService().cancelTask({
        taskId: task_id,
        client: task.client_address,
      });
    } catch (relayErr) {
      console.error('Relayer cancelTask failed:', relayErr);
      const status = relayErr.message === 'RELAYER_NOT_CONFIGURED' ? 503 : 502;
      return res.status(status).json({ detail: 'ESCROW_RELAY_FAILED', error: relayErr.message });
    }

    task.status = 'cancelled';
    await task.save();

    res.json({ task_id, status: 'cancelled', cancel_tx: txHash });
  } catch (error) {
    console.error('Error cancelling task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
