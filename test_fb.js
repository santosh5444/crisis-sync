import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyD9kIv2Ziy20RBZBimeoGo0wdm2KlvG_9U",
  authDomain: "crisissync-29c7b.firebaseapp.com",
  databaseURL: "https://crisissync-29c7b-default-rtdb.firebaseio.com",
  projectId: "crisissync-29c7b",
  storageBucket: "crisissync-29c7b.firebasestorage.app",
  messagingSenderId: "914703800519",
  appId: "1:914703800519:web:02945c6658e54e4da286e2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function testReads() {
  try {
    console.log("Testing reading 'crises'...");
    await get(ref(db, 'crises'));
    console.log("Read 'crises' SUCCESS");
  } catch(e) {
    console.log("Read 'crises' FAILED:", e.message);
  }

  try {
    console.log("Testing reading 'buildingMetadata'...");
    await get(ref(db, 'buildingMetadata'));
    console.log("Read 'buildingMetadata' SUCCESS");
  } catch(e) {
    console.log("Read 'buildingMetadata' FAILED:", e.message);
  }
  process.exit(0);
}
testReads();
