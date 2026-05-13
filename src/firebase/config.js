import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// IMPORTANT: Replace with actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyD9kIv2Ziy20RBZBimeoGo0wdm2KlvG_9U",
  authDomain: "crisissync-29c7b.firebaseapp.com",
  databaseURL: "https://crisissync-29c7b-default-rtdb.firebaseio.com",
  projectId: "crisissync-29c7b",
  storageBucket: "crisissync-29c7b.firebasestorage.app",
  messagingSenderId: "914703800519",
  appId: "1:914703800519:web:02945c6658e54e4da286e2",
  measurementId: "G-DZW1C7S9VQ"
};

const apps = getApps();
const app = apps.length ? apps[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Initialize messaging only if supported (browser might not support it)
export let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});
