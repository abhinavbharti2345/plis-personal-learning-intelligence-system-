// AuthContext.jsx — Global authentication state
import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

/**
 * Ensure user profile exists in Firestore
 */
const ensureUserProfile = async (firebaseUser) => {
  if (!firebaseUser) return;
  
  try {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnapshot = await getDoc(userDocRef);
    
    // If user profile doesn't exist, create it
    if (!userDocSnapshot.exists()) {
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email?.toLowerCase(),
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Persist session via Firebase listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user profile exists
        await ensureUserProfile(firebaseUser);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signup = async (email, password, displayName) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    return credential.user;
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const value = { user, loading, signup, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
