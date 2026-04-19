import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Logs study activity for today and computes the calendar streak mathematically.
 */
export const logStudyActivity = async (uid) => {
  const ref = doc(db, 'users', uid, 'stats', 'streak');
  const snap = await getDoc(ref);
  
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  if (!snap.exists()) {
    await setDoc(ref, {
      currentStreak: 1,
      longestStreak: 1,
      lastLogDate: todayStr,
      updatedAt: serverTimestamp()
    });
    return { currentStreak: 1 };
  }
  
  const data = snap.data();
  if (data.lastLogDate === todayStr) {
    return { currentStreak: data.currentStreak }; // Already logged today
  }
  
  const lastDate = new Date(data.lastLogDate);
  const todayDate = new Date(todayStr);
  const diffTime = Math.abs(todayDate - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let newStreak = 1;
  if (diffDays === 1) {
    newStreak = (data.currentStreak || 0) + 1;
  }
  
  const newLongest = Math.max(newStreak, data.longestStreak || 1);
  
  await updateDoc(ref, {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastLogDate: todayStr,
    updatedAt: serverTimestamp()
  });
  
  return { currentStreak: newStreak };
};

/**
 * Returns the active study streak based on calendar days elapsed. 
 * If no session was logged yesterday or today, it immediately returns 0.
 */
export const getStudyStreak = async (uid) => {
  const ref = doc(db, 'users', uid, 'stats', 'streak');
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  
  const data = snap.data();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const lastDate = new Date(data.lastLogDate);
  const todayDate = new Date(todayStr);
  const diffTime = Math.abs(todayDate - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If difference is strictly > 1 calendar day, streak has broken entirely
  if (diffDays > 1) return 0;
  
  return data.currentStreak || 0;
};
