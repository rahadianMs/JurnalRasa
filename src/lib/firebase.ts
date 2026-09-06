import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  increment,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

// Configure Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfigJson);

// Connect to specified Firestore database
export const db: Firestore = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper to retrieve current Firebase ID Token for API authentication
export async function getCurrentUserToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken();
  } catch (err) {
    console.warn("Failed to get ID token:", err);
    return null;
  }
}

// Clean up guest user data from Firestore when session ends
export async function cleanupGuestSession(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const userPlacesRef = collection(db, `users/${userId}/saved_places`);
    const snapshot = await getDocs(userPlacesRef);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    // Clean up conversation documents if any
    const convRef = collection(db, `users/${userId}/conversations`);
    const convSnapshot = await getDocs(convRef);
    const deleteConvPromises = convSnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deleteConvPromises);
  } catch (err) {
    console.warn("Error cleaning up guest session data:", err);
  }
}

export {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  increment,
  serverTimestamp,
};

export type { User };
