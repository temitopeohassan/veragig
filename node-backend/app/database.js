const admin = require('firebase-admin');
const config = require('./config');
const fs = require('fs');
const path = require('path');

let db;

const initFirestore = () => {
  if (db) return db;

  try {
    let serviceAccount;

    // 1. Try to load from env var first
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const saContent = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (saContent.startsWith('{')) {
        serviceAccount = JSON.parse(saContent);
      } else {
        try {
          serviceAccount = JSON.parse(Buffer.from(saContent, 'base64').toString());
        } catch (e) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON or Base64');
        }
      }
    } 

    // 2. Try to load from local file path if env var didn't work
    if (!serviceAccount) {
      const absolutePath = path.resolve(process.cwd(), config.firebaseServiceAccount);
      if (fs.existsSync(absolutePath)) {
        try {
          const fileContent = fs.readFileSync(absolutePath, 'utf8');
          serviceAccount = JSON.parse(fileContent);
        } catch (e) {
          console.error('Failed to read or parse firebase service account file:', e.message);
        }
      }
    }

    if (!serviceAccount) {
      console.warn('Firebase credentials not found. Database operations will fail.');
      return null;
    }

    // Fix for private key newlines
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
    // Return null instead of throwing to prevent crashing the whole app at startup
    return null;
  }
};

const getFirestore = () => {
  if (!db) {
    const initialized = initFirestore();
    if (!initialized) {
      throw new Error('Database not initialized. Check your FIREBASE_SERVICE_ACCOUNT environment variable.');
    }
  }
  return db;
};

module.exports = { connectDB: initFirestore, getFirestore };
