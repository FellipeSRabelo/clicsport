// Arquivo de Configuração do Firebase (desativado)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from 'firebase/storage';

// Usa prefixo VITE_FIREBASE_* para evitar colisão com Supabase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseEnv = Object.values(firebaseConfig).every(Boolean);

let app = null;
let db = null;
let auth = null;
let storage = null;

if (hasFirebaseEnv) {
  // Inicializa apenas se todas as variáveis estiverem presentes
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  console.log('✅ Firebase inicializado (opcional).');
} else {
  console.warn('⚠️ Firebase desativado: variáveis VITE_FIREBASE_* não configuradas.');
}

export { db, auth, storage };