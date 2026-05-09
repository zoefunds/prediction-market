import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

const useEmu =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1";

export function getFirebase() {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = getAuth(app);
    if (useEmu) {
      try {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", {
          disableWarnings: true,
        });
      } catch {
        /* already connected */
      }
    }
  }
  if (!db) {
    db = getFirestore(app);
    if (useEmu) {
      try {
        connectFirestoreEmulator(db, "127.0.0.1", 8080);
      } catch {
        /* already connected */
      }
    }
  }
  if (!functions) {
    functions = getFunctions(app, "us-central1");
    if (useEmu) {
      try {
        connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      } catch {
        /* already connected */
      }
    }
  }
  return { app, auth, db, functions };
}
