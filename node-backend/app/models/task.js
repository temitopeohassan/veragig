const { getFirestore } = require('../database');

const COLLECTION = 'tasks';
const APP_COLLECTION = 'task_applications';

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

module.exports = { Task, TaskApplication };
