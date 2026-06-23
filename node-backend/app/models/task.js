const { getFirestore } = require('../database');

const COLLECTION = 'tasks';
const APP_COLLECTION = 'task_applications';
const SUBMISSION_COLLECTION = 'task_submissions';

const Task = {
  async create(data) {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(data.id).set({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return data;
  },

  async findAll({ where } = {}) {
    const db = getFirestore();
    let query = db.collection(COLLECTION);

    if (where) {
      Object.entries(where).forEach(([key, value]) => {
        query = query.where(key, '==', value);
      });
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  },

  async findByPk(id) {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id, save: async function() {
      await db.collection(COLLECTION).doc(this.id).update({
        ...this,
        updated_at: new Date(),
      });
    }};
  }
};

const TaskApplication = {
  async create(data) {
    const db = getFirestore();
    await db.collection(APP_COLLECTION).doc(data.id).set({
      ...data,
      created_at: new Date(),
    });
    return data;
  },

  async findAll() {
    const db = getFirestore();
    const snapshot = await db.collection(APP_COLLECTION).get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }
};

// Bounty submissions: a bounty task can have many submissions (one per worker).
// Keyed by `${taskId}:${workerAddress}` so a worker can resubmit (overwrite) and
// can't create duplicate rows. `status` is pending | accepted | rejected.
const TaskSubmission = {
  _docId(taskId, workerAddress) {
    return `${taskId}:${workerAddress.toLowerCase()}`;
  },

  async upsert(data) {
    const db = getFirestore();
    const id = TaskSubmission._docId(data.task_id, data.worker_address);
    const ref = db.collection(SUBMISSION_COLLECTION).doc(id);
    const existing = await ref.get();
    await ref.set(
      {
        id,
        task_id: data.task_id,
        worker_address: data.worker_address.toLowerCase(),
        deliverable_cid: data.deliverable_cid || null,
        notes: data.notes || null,
        status: 'pending',
        updated_at: new Date(),
        ...(existing.exists ? {} : { created_at: new Date() }),
      },
      { merge: true }
    );
    return { ...(await ref.get()).data(), id };
  },

  async findByTask(taskId) {
    const db = getFirestore();
    const snapshot = await db
      .collection(SUBMISSION_COLLECTION)
      .where('task_id', '==', taskId)
      .get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  },

  async setStatus(id, status) {
    const db = getFirestore();
    await db.collection(SUBMISSION_COLLECTION).doc(id).set(
      { status, updated_at: new Date() },
      { merge: true }
    );
  },
};

module.exports = { Task, TaskApplication, TaskSubmission };
