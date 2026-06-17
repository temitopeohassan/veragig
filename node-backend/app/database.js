const admin = require('firebase-admin');
const config = require('./config');
const fs = require('fs');
const path = require('path');

let db;
let lastInitError = null;

/**
 * Sanitize a JSON string by escaping actual newline and carriage return characters.
 * This handles cases where multi-line JSON was pasted directly into environment variables.
 */
const sanitizeJsonString = (str) => {
  if (!str) return str;
  // Replace actual newlines with escaped \n, but keep existing escaped \n as is
  // This is a simple regex that finds characters with char code 10 or 13
  return str.replace(/[\n\r]/g, '\\n');
};

const initFirestore = () => {
  if (db) return db;

  try {
    let serviceAccount;
    const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (envVar) {
      console.log('Attempting to load Firebase credentials from environment variable...');
      const saContent = envVar.trim();
      
      if (saContent.startsWith('{')) {
        try {
          // Attempt parsing with sanitization for literal newlines
          const sanitized = sanitizeJsonString(saContent);
          serviceAccount = JSON.parse(sanitized);
          console.log('Successfully parsed FIREBASE_SERVICE_ACCOUNT as JSON.');
        } catch (e) {
          lastInitError = 'JSON Parse Error: ' + e.message;
          console.error(lastInitError);
        }
      } else {
        try {
          serviceAccount = JSON.parse(Buffer.from(saContent, 'base64').toString());
          console.log('Successfully parsed FIREBASE_SERVICE_ACCOUNT as Base64.');
        } catch (e) {
          lastInitError = 'Base64/JSON Parse Error: ' + e.message;
          console.error(lastInitError);
        }
      }
    } 

    if (!serviceAccount) {
      console.log('Checking local file path for Firebase credentials:', config.firebaseServiceAccount);
      const absolutePath = path.resolve(process.cwd(), config.firebaseServiceAccount);
      if (fs.existsSync(absolutePath)) {
        try {
          const fileContent = fs.readFileSync(absolutePath, 'utf8');
          serviceAccount = JSON.parse(fileContent);
          console.log('Successfully loaded Firebase credentials from local file.');
        } catch (e) {
          lastInitError = 'File Read/Parse Error: ' + e.message;
          console.error(lastInitError);
        }
      }
    }

    if (!serviceAccount) {
      lastInitError = lastInitError || 'No credentials found in FIREBASE_SERVICE_ACCOUNT or local file.';
      console.warn(lastInitError);
      return null;
    }

    // Fix for private key newlines (both literal and escaped)
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
    lastInitError = null;
    return db;
  } catch (error) {
    lastInitError = 'Initialization Crash: ' + error.message;
    console.error(lastInitError);
    return null;
  }
};

const getFirestore = () => {
  if (!db) {
    const initialized = initFirestore();
    if (!initialized) {
      throw new Error(lastInitError || 'Database not initialized.');
    }
  }
  return db;
};

const getLastError = () => lastInitError;

module.exports = { connectDB: initFirestore, getFirestore, getLastError };
