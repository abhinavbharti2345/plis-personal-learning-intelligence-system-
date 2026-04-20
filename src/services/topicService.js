// topicService.js — Firestore CRUD for topics
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
  arrayUnion, arrayRemove,
  getDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { softDeleteKnowledgeByTopic } from './noteService';

/**
 * Returns the Firestore collection ref for a user's topics.
 */
const topicsRef = (uid) => collection(db, 'users', uid, 'topics');

/**
 * Normalize topic data for backward compatibility during migration.
 * - Ensures `connections` exists and is deduplicated.
 * - Mirrors parentId into connections for legacy data so graph view works immediately.
 */
const normalizeTopic = (topic) => {
  const baseConnections = Array.isArray(topic.connections) ? topic.connections : [];
  const merged = topic.parentId
    ? [...baseConnections, topic.parentId]
    : baseConnections;

  const connections = [...new Set(merged.filter((id) => id && id !== topic.id))];

  return {
    ...topic,
    connections,
    position: topic.position || null,
  };
};

const topicRef = (uid, topicId) => doc(db, 'users', uid, 'topics', topicId);

/**
 * Subscribe to all topics for a user in real-time.
 * @returns unsubscribe function
 */
export const subscribeToTopics = (uid, callback) => {
  const q = query(topicsRef(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const topics = snapshot.docs.map((d) => normalizeTopic({ id: d.id, ...d.data() }));
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
    connections: [],
    position: null,
    status: 'not_started',
    tags: [],
    timeSpent: 0,
    questionsAttempted: 0,
    correctAnswers: 0,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
  };
  const ref = await addDoc(topicsRef(uid), { ...defaults, ...data });

  const parentId = data?.parentId || null;
  if (parentId && parentId !== ref.id) {
    await connectTopicsBidirectional(uid, ref.id, parentId);
  }

  return ref.id;
};

/**
 * Update specific fields of a topic.
 */
export const updateTopic = async (uid, topicId, data) => {
  const ref = topicRef(uid, topicId);
  await updateDoc(ref, { ...data, lastUpdated: serverTimestamp() });

  // Tree->graph sync rule: parent assignment should always imply a graph connection.
  if (Object.prototype.hasOwnProperty.call(data, 'parentId')) {
    const parentId = data.parentId || null;
    if (parentId && parentId !== topicId) {
      await connectTopicsBidirectional(uid, topicId, parentId);
    }
  }
};

/**
 * Delete a topic (and optionally re-parent children to null).
 */
export const deleteTopic = async (uid, topicId) => {
  const ref = topicRef(uid, topicId);

  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : null;
  const connections = Array.isArray(data?.connections) ? data.connections : [];

  if (connections.length > 0) {
    await Promise.all(
      connections
        .filter((id) => id && id !== topicId)
        .map((connectedId) => updateDoc(topicRef(uid, connectedId), {
          connections: arrayRemove(topicId),
          lastUpdated: serverTimestamp(),
        }))
    );
  }

  // Preserve recoverability: knowledge assets are soft-deleted for 30-day recovery.
  await softDeleteKnowledgeByTopic(uid, topicId);

  await deleteDoc(ref);
};

/**
 * Log a practice session — adds to existing counts.
 */
export const logPerformance = async (uid, topicId, { timeSpent = 0, attempted = 0, correct = 0 }) => {
  const ref = topicRef(uid, topicId);
  await updateDoc(ref, {
    timeSpent:          increment(timeSpent),
    questionsAttempted: increment(attempted),
    correctAnswers:     increment(correct),
    lastUpdated:        serverTimestamp(),
  });
};

/**
 * Create a bidirectional graph connection while preventing self-links.
 */
export const connectTopicsBidirectional = async (uid, a, b) => {
  if (!a || !b || a === b) return;

  const aRef = topicRef(uid, a);
  const bRef = topicRef(uid, b);

  await Promise.all([
    updateDoc(aRef, {
      connections: arrayUnion(b),
      lastUpdated: serverTimestamp(),
    }),
    updateDoc(bRef, {
      connections: arrayUnion(a),
      lastUpdated: serverTimestamp(),
    }),
  ]);
};

/**
 * Remove a bidirectional graph connection.
 */
export const disconnectTopicsBidirectional = async (uid, a, b) => {
  if (!a || !b || a === b) return;

  const aRef = topicRef(uid, a);
  const bRef = topicRef(uid, b);

  await Promise.all([
    updateDoc(aRef, {
      connections: arrayRemove(b),
      lastUpdated: serverTimestamp(),
    }),
    updateDoc(bRef, {
      connections: arrayRemove(a),
      lastUpdated: serverTimestamp(),
    }),
  ]);
};
