const { getFirestore } = require('../database');

const COLLECTION = 'profiles';

// Profiles are keyed by the lowercased wallet address.
const Profile = {
  async create(data) {
    const db = getFirestore();
    const address = data.address.toLowerCase();
    await db.collection(COLLECTION).doc(address).set({
      address,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      account_tx_hash: data.account_tx_hash || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return Profile.findByPk(address);
  },

  async findByPk(address) {
    const db = getFirestore();
    const doc = await db.collection(COLLECTION).doc(address.toLowerCase()).get();
    if (!doc.exists) return null;
    return { ...doc.data(), address: doc.id };
  },

  async update(address, data) {
    const db = getFirestore();
    await db.collection(COLLECTION).doc(address.toLowerCase()).set(
      { ...data, updated_at: new Date() },
      { merge: true }
    );
    return Profile.findByPk(address);
  },
};

module.exports = { Profile };
