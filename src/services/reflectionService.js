// reflectionService.js — Firestore CRUD for daily reflections
import {
  collection, doc, setDoc, query, orderBy,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const reflectionsRef = (uid) => collection(db, 'users', uid, 'reflections');

/**
 * Save (upsert) a reflection using today's date as document ID.
 */
export const saveReflection = async (uid, content, keywords, sentiment) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const ref = doc(db, 'users', uid, 'reflections', today);
  await setDoc(ref, {
    content,
    keywords,
    sentiment,
    date: today,
    timestamp: serverTimestamp(),
  }, { merge: true });
};

/**
 * Subscribe to all reflections in real-time.
 */
export const subscribeToReflections = (uid, callback) => {
  const q = query(reflectionsRef(uid), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};
