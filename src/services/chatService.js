// chatService.js — Firebase Realtime DB for discussion chat
import { ref, push, set, onChildAdded, off, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';

/**
 * Send a chat message to a discussion room.
 */
export const sendMessage = async (chatId, payload) => {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const messageRef = push(messagesRef);
  await set(messageRef, {
    id: messageRef.key,
    senderId: payload.senderId || payload.uid,
    displayName: payload.displayName,
    text: payload.text,
    createdAt: serverTimestamp(),
  });
};

/**
 * Subscribe to new messages for a discussion room.
 * @returns cleanup function
 */
export const subscribeToChat = (chatId, callback) => {
  const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
  const handler = (snapshot) => {
    callback({ id: snapshot.key, ...snapshot.val() });
  };
  onChildAdded(messagesRef, handler);
  return () => off(messagesRef, 'child_added', handler);
};
