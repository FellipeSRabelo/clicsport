// Arquivo de Configuração do Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from 'firebase/storage';

// As variáveis de ambiente (VITE_...) são lidas automaticamente pelo Vite
// Elas devem estar configuradas no seu arquivo .env.local e no Vercel
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

// DEBUG: Verificar se variáveis estão sendo carregadas
console.log('Firebase Config carregado:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Dev-only: log the firebase project config to help debug mismatched projects/rules
if (import.meta.env.DEV) {
  try {
    console.info('Firebase config (dev):', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKey: firebaseConfig.apiKey ? '***' : undefined
    });
  } catch (e) {
    // ignore
  }
}

export { db, auth, storage };