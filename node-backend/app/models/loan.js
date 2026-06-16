const { getFirestore } = require('../database');

const COLLECTION = 'loans';

const Loan = {
  async create(data) {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(data.id).set({
      ...data,
      created_at: new Date(),
    });
    return data;
  },

  async findByPk(id) {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id, save: async function() {
      await db.collection(COLLECTION).doc(this.id).update(this);
    }};
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
  }
};

module.exports = { Loan };
