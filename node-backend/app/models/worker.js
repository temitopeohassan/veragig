const { getFirestore } = require('../database');

const COLLECTION = 'workers';

const Worker = {
  async create(data) {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(data.address).set({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return data;
  },

  async findByPk(address) {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(address).get();
    if (!doc.exists) return null;
    return { ...doc.data(), address: doc.id, save: async function() {
      await db.collection(COLLECTION).doc(this.address).update({
        ...this,
        updated_at: new Date(),
      });
    }};
  },

  async update(address, data) {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(address).set(data, { merge: true });
  }
};

module.exports = { Worker };
