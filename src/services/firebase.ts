import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAT5fKJH-E8_JurGkLW9ykHPZAlGdYUxnA',
  authDomain: 'expense-tracker-8745f.firebaseapp.com',
  projectId: 'expense-tracker-8745f',
  storageBucket: 'expense-tracker-8745f.firebasestorage.app',
  messagingSenderId: '797101749995',
  appId: '1:797101749995:web:76cb44bf0b32cc404430ae',
  measurementId: 'G-L3G1HXM1EG',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);

// Keep Firestore data available across browser refreshes and support
// offline writes that are synchronized automatically when connectivity returns.
export const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;
