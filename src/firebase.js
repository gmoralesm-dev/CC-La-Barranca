// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔐 Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 🚀 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 📊 Initialize Firebase services
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);

// 🔌 AUTOMATIC EMULATOR CONFIGURATION (Only in localhost)
/*
if (typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
  
  // Connect to Firestore Emulator
  import("firebase/firestore").then(({ connectFirestoreEmulator }) => {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    console.log("🔌 Firestore Emulator conectado (Puerto 8080)");
  }).catch(err => console.warn("⚠️ Firestore Emulator no disponible:", err));
  
  // Connect to Auth Emulator
  import("firebase/auth").then(({ connectAuthEmulator }) => {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    console.log("🔐 Auth Emulator conectado (Puerto 9099)");
  }).catch(err => console.warn("⚠️ Auth Emulator no disponible:", err));
}
*/

// 📍 CENTRAL PATH CONFIGURATION
export const COLLECTION = "Consejo-Comunal-La-Barranca";
export const DATA_DOCUMENT = "data";
export const USERS_COLLECTION = "users";
export const INVITADOS_COLLECTION = "invitados";
