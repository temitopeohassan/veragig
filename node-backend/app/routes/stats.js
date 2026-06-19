const express = require('express');
const { Task, TaskApplication } = require('../models/task');

const router = express.Router();

// Statuses that represent funds actively being / already streamed to workers.
const STREAMED_STATUSES = new Set(['assigned', 'submitted', 'completed']);

router.get('/', async (req, res) => {
  try {
    const [tasks, applications] = await Promise.all([
      Task.findAll(),
      TaskApplication.findAll(),
    ]);

    const tasksPosted = tasks.length;

    // Sum reward_wei (stored as strings) for tasks whose funds have started
    // streaming. Only tasks flagged release_as_stream count toward "G$ streamed";
    // lump-sum payouts are excluded. (Legacy/undefined defaults to streamed.)
    const gStreamedWei = tasks.reduce((sum, t) => {
      if (!STREAMED_STATUSES.has(t.status)) return sum;
      if (t.release_as_stream === false) return sum;
      try {
        return sum + BigInt(t.reward_wei || '0');
      } catch {
        return sum;
      }
    }, 0n);

    // Distinct workers who have applied — all are identity-verified at apply time.
    const verifiedWorkers = new Set(
      applications
        .map(a => (a.worker_address || '').toLowerCase())
        .filter(Boolean)
    ).size;

    res.json({
      tasks_posted: tasksPosted,
      g_streamed_wei: gStreamedWei.toString(),
      verified_workers: verifiedWorkers,
    });
  } catch (error) {
    console.error('Error computing stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
