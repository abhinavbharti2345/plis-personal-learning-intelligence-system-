// noteService.js — Firestore CRUD for topic notes
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const noteRef = (uid, topicId) => doc(db, 'users', uid, 'notes', topicId);

/**
 * Fetch a note by topicId.
 */
export const getNote = async (uid, topicId) => {
  const snap = await getDoc(noteRef(uid, topicId));
  if (snap.exists()) return snap.data();
  return { topicId, content: '', updatedAt: null };
};

/**
 * Save (upsert) a note for a topic.
 */
export const saveNote = async (uid, topicId, content) => {
  await setDoc(noteRef(uid, topicId), {
    topicId,
    content,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
