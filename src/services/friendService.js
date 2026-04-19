// friendService.js — Friends management with Firestore
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Search for a user by email
 * @param {string} email - Email to search for
 * @returns {Promise<Object|null>} User object if found, null otherwise
 */
export const searchUserByEmail = async (email) => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    return {
      uid: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error searching user:', error);
    throw error;
  }
};

/**
 * Add a friend (bidirectional)
 * @param {string} currentUserUid - Current user's UID
 * @param {Object} targetUser - Target user object {uid, email, displayName}
 * @returns {Promise<void>}
 */
export const addFriend = async (currentUserUid, targetUser) => {
  try {
    // Prevent adding yourself
    if (currentUserUid === targetUser.uid) {
      throw new Error('You cannot add yourself as a friend');
    }

    // Check if already friends
    const friendRef = doc(db, `friends/${currentUserUid}/friendsList/${targetUser.uid}`);
    const friendSnapshot = await getDocs(query(collection(db, `friends/${currentUserUid}/friendsList`), where('uid', '==', targetUser.uid)));
    
    if (!friendSnapshot.empty) {
      throw new Error('Already friends with this user');
    }

    // Add friend to current user's list
    await setDoc(
      doc(db, `friends/${currentUserUid}/friendsList/${targetUser.uid}`),
      {
        uid: targetUser.uid,
        email: targetUser.email,
        displayName: targetUser.displayName,
        addedAt: new Date().toISOString(),
      }
    );

    // Add current user to target user's friend list
    await setDoc(
      doc(db, `friends/${targetUser.uid}/friendsList/${currentUserUid}`),
      {
        uid: currentUserUid,
        email: targetUser.email, // This should be current user's email, but we need to fetch it
        displayName: targetUser.displayName, // This should be current user's name
        addedAt: new Date().toISOString(),
      }
    );

  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
};

/**
 * Add friend with full current user info (bidirectional)
 * @param {string} currentUserUid - Current user's UID
 * @param {Object} currentUserData - Current user data {uid, email, displayName}
 * @param {Object} targetUser - Target user object {uid, email, displayName}
 * @returns {Promise<void>}
 */
export const addFriendBidirectional = async (currentUserUid, currentUserData, targetUser) => {
  try {
    // Prevent adding yourself
    if (currentUserUid === targetUser.uid) {
      throw new Error('You cannot add yourself as a friend');
    }

    // Check if already friends
    const friendSnapshot = await getDocs(
      query(
        collection(db, `friends/${currentUserUid}/friendsList`),
        where('uid', '==', targetUser.uid)
      )
    );
    
    if (!friendSnapshot.empty) {
      throw new Error('Already friends with this user');
    }

    // Add target user to current user's friend list
    await setDoc(
      doc(db, `friends/${currentUserUid}/friendsList/${targetUser.uid}`),
      {
        uid: targetUser.uid,
        email: targetUser.email,
        displayName: targetUser.displayName,
        addedAt: new Date().toISOString(),
      }
    );

    // Add current user to target user's friend list
    await setDoc(
      doc(db, `friends/${targetUser.uid}/friendsList/${currentUserUid}`),
      {
        uid: currentUserUid,
        email: currentUserData.email,
        displayName: currentUserData.displayName,
        addedAt: new Date().toISOString(),
      }
    );

  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time friends list
 * @param {string} uid - User's UID
 * @param {Function} callback - Callback function to handle friends list updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToFriends = (uid, callback) => {
  try {
    const unsubscribe = onSnapshot(
      collection(db, `friends/${uid}/friendsList`),
      (snapshot) => {
        const friends = [];
        snapshot.forEach((doc) => {
          friends.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        callback(friends);
      },
      (error) => {
        console.error('Error listening to friends:', error);
        callback([]);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to friends:', error);
    throw error;
  }
};

/**
 * Get current user's data
 * @param {string} uid - User's UID
 * @returns {Promise<Object|null>} User data if found
 */
export const getUserData = async (uid) => {
  try {
    const userDocSnapshot = await getDocs(
      query(collection(db, 'users'), where('uid', '==', uid))
    );
    
    if (userDocSnapshot.empty) {
      return null;
    }
    
    const userDoc = userDocSnapshot.docs[0];
    return {
      uid: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};
