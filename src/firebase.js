// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔐 Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// 🚀 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 📊 Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// 📈 Analytics solo fuera de localhost y si el entorno lo soporta (evita fetchDynamicConfig en local/offline)
export let analytics = null;
if (
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
) {
  import("firebase/analytics")
    .then(({ isSupported, getAnalytics }) => {
      isSupported()
        .then((supported) => {
          if (supported) {
            analytics = getAnalytics(app);
          }
        })
        .catch(() => {});
    })
    .catch(() => {});
}

// 🛡️ Habilitar persistencia offline en el navegador para resiliencia ante fallos de conexión
if (typeof window !== "undefined") {
  import("firebase/firestore").then(({ enableIndexedDbPersistence }) => {
    if (typeof enableIndexedDbPersistence === "function") {
      enableIndexedDbPersistence(db).catch((err) => {
        // Modo silencioso: múltiples pestañas o entorno no compatible
        console.warn("Persistencia offline Firestore:", err?.code || err);
      });
    }
  }).catch(() => {});
}

// Nota: para desarrollo local con Firebase Emulator Suite, ver Sección 7 del Manual Técnico.

// 📍 CENTRAL PATH CONFIGURATION
export const COLLECTION = "Consejo-Comunal-La-Barranca";
export const DATA_DOCUMENT = "data";
export const USERS_COLLECTION = "users";
export const INVITADOS_COLLECTION = "invitados";
