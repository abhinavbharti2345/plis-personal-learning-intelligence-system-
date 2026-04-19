// whiteboardService.js — Realtime whiteboard sync via Firebase Realtime Database
import { ref, onValue, off, set, update, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';

export const subscribeToWhiteboard = (topicId, callback) => {
  const whiteboardRef = ref(rtdb, `whiteboards/${topicId}`);
  const handler = (snapshot) => {
    callback(snapshot.val() || null);
  };

  onValue(whiteboardRef, handler);
  return () => off(whiteboardRef, 'value', handler);
};

export const saveWhiteboardState = async (topicId, strokes) => {
  const whiteboardRef = ref(rtdb, `whiteboards/${topicId}`);
  await set(whiteboardRef, {
    strokes,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToWhiteboardStrokes = (roomId, callback) => {
  const strokesRef = ref(rtdb, `whiteboards/${roomId}/strokes`);
  const handler = (snapshot) => {
    callback(snapshot.val() || {});
  };

  onValue(strokesRef, handler);
  return () => off(strokesRef, 'value', handler);
};

export const saveWhiteboardStrokes = async (roomId, strokesObject) => {
  const whiteboardRef = ref(rtdb, `whiteboards/${roomId}`);
  await update(whiteboardRef, {
    strokes: strokesObject,
    updatedAt: serverTimestamp(),
  });
};
