import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBlXo2Tsu6sjlcfUkG3WkwBBf_C9MXquV8',
  authDomain: 'flash-oath-0xjsq.firebaseapp.com',
  projectId: 'flash-oath-0xjsq',
  storageBucket: 'flash-oath-0xjsq.firebasestorage.app',
  messagingSenderId: '154936023209',
  appId: '1:154936023209:web:a83e502c1910b5217031b8',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
export default app;
