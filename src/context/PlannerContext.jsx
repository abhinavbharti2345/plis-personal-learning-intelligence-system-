import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToDaily, addDailyTask, updateDailyTask, deleteDailyTask } from '../services/plannerService';

const PlannerContext = createContext(null);

export const PlannerProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Track today's tasks globally since they appear on Dashboard and Right Sidebar
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derive today's date in YYYY-MM-DD
  const [todayStr, setTodayStr] = useState(new Date().toISOString().split('T')[0]);
  
  // Update todayStr dynamically if they leave tab running past midnight
  useEffect(() => {
    const interval = setInterval(() => {
      setTodayStr(new Date().toISOString().split('T')[0]);
    }, 60000 * 60); // Check every hour
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) {
      setTodayTasks([]);
      return;
    }
    setLoading(true);
    
    // Globally subscribe to today's daily tasks
    const unsub = subscribeToDaily(user.uid, todayStr, (tasks) => {
      setTodayTasks(tasks);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user, todayStr]);

  const value = {
    todayTasks,
    loading,
    todayStr,
    addDailyTask: (data) => addDailyTask(user.uid, data),
    updateDailyTask: (id, data) => updateDailyTask(user.uid, id, data),
    deleteDailyTask: (id) => deleteDailyTask(user.uid, id),
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
};

export const usePlanner = () => {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
};
