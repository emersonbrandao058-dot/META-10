// CONFIG FIREBASE (Firestore + Storage)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLo6urBT4dmM79I_Hm9pKDamkxULtZSy8",
  authDomain: "meta10-55f42.firebaseapp.com",
  projectId: "meta10-55f42",
  storageBucket: "meta10-55f42.firebasestorage.app",
  messagingSenderId: "876568782273",
  appId: "1:876568782273:web:59454c41f83119448a3b40",
  measurementId: "G-GYJ6WG5XGJ"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
