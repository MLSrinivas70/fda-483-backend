import admin from 'firebase-admin';

let adminApp;

try {

  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'fda-483.firebasestorage.app',
  });
  console.log('✅ Firebase initialized with service account file');
} catch (error) {
  console.warn('⚠️  Service account file not found, trying environment variables...');
    

  if (serviceAccount.private_key && serviceAccount.client_email) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'fda-483.firebasestorage.app',
    });
    console.log('✅ Firebase initialized with environment variables');
  } else {
    console.error('❌ Firebase credentials not found. Please add serviceAccountKey.json file or set environment variables.');
    throw new Error('Firebase credentials not found. Please add serviceAccountKey.json file or set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL environment variables.');
  }
}

const bucket = admin.storage().bucket();
const db = admin.firestore();

export { admin, bucket, db };
