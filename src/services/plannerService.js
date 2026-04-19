import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ── Daily Planner ────────────────────────────────────────────────────────
const dailyRef = (uid) => collection(db, 'users', uid, 'planner_daily');

export const subscribeToDaily = (uid, date, callback) => {
  const q = query(dailyRef(uid), where('date', '==', date));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(tasks);
  });
};

export const addDailyTask = async (uid, data) => {
  return await addDoc(dailyRef(uid), {
    ...data,
    completed: false,
    createdAt: serverTimestamp()
  });
};

export const updateDailyTask = async (uid, taskId, data) => {
  const ref = doc(db, 'users', uid, 'planner_daily', taskId);
  await updateDoc(ref, data);
};

export const deleteDailyTask = async (uid, taskId) => {
  const ref = doc(db, 'users', uid, 'planner_daily', taskId);
  await deleteDoc(ref);
};

// ── Weekly Planner ───────────────────────────────────────────────────────
const weeklyRef = (uid) => collection(db, 'users', uid, 'planner_weekly');

export const subscribeToWeekly = (uid, weekStartDate, callback) => {
  const q = query(weeklyRef(uid), where('weekStartDate', '==', weekStartDate));
  return onSnapshot(q, (snapshot) => {
    const plans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(plans);
  });
};

export const addWeeklyPlan = async (uid, data) => {
  return await addDoc(weeklyRef(uid), {
    ...data,
    createdAt: serverTimestamp()
  });
};

export const updateWeeklyPlan = async (uid, planId, data) => {
  const ref = doc(db, 'users', uid, 'planner_weekly', planId);
  await updateDoc(ref, data);
};

export const deleteWeeklyPlan = async (uid, planId) => {
  const ref = doc(db, 'users', uid, 'planner_weekly', planId);
  await deleteDoc(ref);
};

// ── Monthly Planner ──────────────────────────────────────────────────────
const monthlyRef = (uid) => collection(db, 'users', uid, 'planner_monthly');

export const subscribeToMonthly = (uid, month, callback) => {
  const q = query(monthlyRef(uid), where('month', '==', month), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const goals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(goals);
  });
};

export const addMonthlyGoal = async (uid, data) => {
  return await addDoc(monthlyRef(uid), {
    ...data,
    progress: 0,
    createdAt: serverTimestamp()
  });
};

export const updateMonthlyGoal = async (uid, goalId, data) => {
  const ref = doc(db, 'users', uid, 'planner_monthly', goalId);
  await updateDoc(ref, data);
};

export const deleteMonthlyGoal = async (uid, goalId) => {
  const ref = doc(db, 'users', uid, 'planner_monthly', goalId);
  await deleteDoc(ref);
};
