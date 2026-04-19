// topicService.js — Firestore CRUD for topics
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Returns the Firestore collection ref for a user's topics.
 */
const topicsRef = (uid) => collection(db, 'users', uid, 'topics');

/**
 * Subscribe to all topics for a user in real-time.
 * @returns unsubscribe function
 */
export const subscribeToTopics = (uid, callback) => {
  const q = query(topicsRef(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const topics = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(topics);
  });
};

/**
 * Create a new topic.
 */
export const createTopic = async (uid, data) => {
  const defaults = {
    title: 'Untitled Topic',
    description: '',
    parentId: null,
    status: 'not_started',
    tags: [],
    timeSpent: 0,
    questionsAttempted: 0,
    correctAnswers: 0,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
  };
  const ref = await addDoc(topicsRef(uid), { ...defaults, ...data });
  return ref.id;
};

/**
 * Update specific fields of a topic.
 */
export const updateTopic = async (uid, topicId, data) => {
  const ref = doc(db, 'users', uid, 'topics', topicId);
  await updateDoc(ref, { ...data, lastUpdated: serverTimestamp() });
};

/**
 * Delete a topic (and optionally re-parent children to null).
 */
export const deleteTopic = async (uid, topicId) => {
  const ref = doc(db, 'users', uid, 'topics', topicId);
  await deleteDoc(ref);
};

/**
 * Log a practice session — adds to existing counts.
 */
export const logPerformance = async (uid, topicId, { timeSpent = 0, attempted = 0, correct = 0 }) => {
  const ref = doc(db, 'users', uid, 'topics', topicId);
  // Firestore increment
  const { increment } = await import('firebase/firestore');
  await updateDoc(ref, {
    timeSpent:          increment(timeSpent),
    questionsAttempted: increment(attempted),
    correctAnswers:     increment(correct),
    lastUpdated:        serverTimestamp(),
  });
};
