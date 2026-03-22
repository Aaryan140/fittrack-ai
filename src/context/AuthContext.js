// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── listen to Firebase auth state ──────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Google Sign-In ──────────────────────────────────────────
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
  };

  // ── Email/Password Sign-Up ──────────────────────────────────
  const signUpWithEmail = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await ensureUserDoc(result.user);
  };

  // ── Email/Password Sign-In ──────────────────────────────────
  const signInWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // ── Sign Out ────────────────────────────────────────────────
  const logout = () => signOut(auth);

  // ── Create Firestore user doc on first login ────────────────
  const ensureUserDoc = async (firebaseUser) => {
    const ref  = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName || "",
        photoURL:    firebaseUser.photoURL    || "",
        setupDone:   false,
        createdAt:   serverTimestamp(),
      });
    }
    const updated = await getDoc(ref);
    setProfile(updated.data());
  };

  // ── Save / update fitness profile ──────────────────────────
  const saveProfile = async (data) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    setProfile((p) => ({ ...p, ...data }));
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, saveProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
