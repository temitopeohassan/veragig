const admin = require('firebase-admin');
const config = require('./config');
const fs = require('fs');
const path = require('path');

let db;
let lastInitError = null;
let debugInfo = "";

const initFirestore = () => {
  if (db) return db;

  try {
    let serviceAccount;
    let saContent = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (saContent) {
      saContent = saContent.trim();
      // Remove accidental wrapping quotes if present
      if ((saContent.startsWith('"') && saContent.endsWith('"')) || 
          (saContent.startsWith("'") && saContent.endsWith("'"))) {
        saContent = saContent.slice(1, -1).trim();
      }

      debugInfo = `Length: ${saContent.length}, Starts with: ${saContent.substring(0, 5)}`;

      if (saContent.startsWith('{')) {
        try {
          // Fix literal newlines that break JSON.parse
          const sanitized = saContent.replace(/[\n\r]/g, '\\n');
          serviceAccount = JSON.parse(sanitized);
        } catch (e) {
          lastInitError = 'JSON Parse Error: ' + e.message;
        }
      } else {
        try {
          // Try Base64 decoding
          const decoded = Buffer.from(saContent, 'base64').toString('utf8');
          if (decoded.startsWith('{')) {
            serviceAccount = JSON.parse(decoded);
          } else {
            lastInitError = 'Decoded Base64 is not valid JSON';
          }
        } catch (e) {
          lastInitError = 'Base64/JSON Error: ' + e.message;
        }
      }
    } 

    if (!serviceAccount) {
      const absolutePath = path.resolve(process.cwd(), config.firebaseServiceAccount);
      if (fs.existsSync(absolutePath)) {
        try {
          serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
        } catch (e) {
          lastInitError = 'File Error: ' + e.message;
        }
      }
    }

    if (!serviceAccount) {
      lastInitError = lastInitError || 'No credentials found';
      return null;
    }

    // Standard fix for private keys
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // Robust check for existing apps
    const currentApps = admin.apps || [];
    if (currentApps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }


    db = admin.firestore();
    lastInitError = null;
    return db;
  } catch (error) {
    lastInitError = 'Crash: ' + error.message;
    return null;
  }
};

module.exports = { 
  connectDB: initFirestore, 
  getFirestore: () => {
    const d = initFirestore();
    if (!d) throw new Error(lastInitError || 'DB not ready');
    return d;
  },
  getDiagnostics: () => ({ error: lastInitError, info: debugInfo })
};
