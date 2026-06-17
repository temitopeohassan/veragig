const admin = require('firebase-admin');
const config = require('./config');
const fs = require('fs');
const path = require('path');

let db;

const initFirestore = () => {
  if (db) return db;

  try {
    let serviceAccount;

    // 1. Try to load from env var first (highest priority in production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const saContent = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (saContent.startsWith('{')) {
        serviceAccount = JSON.parse(saContent);
      } else {
        // If it's a base64 encoded string (common for complex JSON in env vars)
        try {
          serviceAccount = JSON.parse(Buffer.from(saContent, 'base64').toString());
        } catch (e) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON or Base64');
        }
      }
    } 
    // 2. Try to load from local file path
    else {
      const absolutePath = path.resolve(config.firebaseServiceAccount);
      if (fs.existsSync(absolutePath)) {
        serviceAccount = require(absolutePath);
      } else {
        throw new Error('Firebase service account not found in env or file system.');
      }
    }

    // Fix for private key newlines in environment variables
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    db = admin.firestore();
    console.log('Firestore initialized successfully.');
    return db;
  } catch (error) {
    console.error('Firestore initialization error:', error.message);
    throw error;
  }
};

const getFirestore = () => {
  if (!db) {
    return initFirestore();
  }
  return db;
};

module.exports = { connectDB: initFirestore, getFirestore };
