// chatService.js — Firebase Realtime DB for topic-based chat
import { ref, push, onChildAdded, off, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';

/**
 * Send a chat message to a topic's chat room.
 */
export const sendMessage = async (topicId, { uid, displayName, text }) => {
  const chatRef = ref(rtdb, `chats/${topicId}`);
  await push(chatRef, {
    uid,
    displayName,
    text,
    timestamp: serverTimestamp(),
  });
};

/**
 * Subscribe to new messages for a topic.
 * @returns cleanup function
 */
export const subscribeToChat = (topicId, callback) => {
  const chatRef = ref(rtdb, `chats/${topicId}`);
  const handler = (snapshot) => {
    callback({ id: snapshot.key, ...snapshot.val() });
  };
  onChildAdded(chatRef, handler);
  return () => off(chatRef, 'child_added', handler);
};
