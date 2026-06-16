const admin = require('firebase-admin');
const config = require('./config');
const fs = require('fs');
const path = require('path');

let db;

const connectDB = async () => {
  if (db) return db;

  try {
    let serviceAccount;

    if (config.firebaseServiceAccount.startsWith('{')) {
      // If it's a JSON string from env var
      serviceAccount = JSON.parse(config.firebaseServiceAccount);
    } else {
      // If it's a path to a file
      const absolutePath = path.resolve(config.firebaseServiceAccount);
      if (fs.existsSync(absolutePath)) {
        serviceAccount = require(absolutePath);
      } else {
        // Fallback for production if file is deleted but env var is not yet set
        console.warn('Firebase service account file not found, attempting to use FIREBASE_SERVICE_ACCOUNT env var');
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
           serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else {
           throw new Error('Firebase service account not configured.');
        }
      }
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    db = admin.firestore();
    console.log('Firestore connected successfully.');
    return db;
  } catch (error) {
    console.error('Firestore connection error:', error.message);
    // In serverless, we might not want to throw, but Firestore is critical here
    throw error;
  }
};

const getFirestore = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

module.exports = { connectDB, getFirestore };
