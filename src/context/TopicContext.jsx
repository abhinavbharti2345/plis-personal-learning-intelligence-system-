// TopicContext.jsx — Global topic state with Firestore real-time sync
import { createContext, useContext, useEffect, useReducer } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  logPerformance,
} from '../services/topicService';
import { getStudyStreak, logStudyActivity } from '../services/activityService';

// ─── State shape ────────────────────────────────────────────────────────────
const initialState = {
  topics:  [],
  loading: true,
  error:   null,
  streak:  0,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_TOPICS':
      return { ...state, topics: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_STREAK':
      return { ...state, streak: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};

const TopicContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export const TopicProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Real-time Firestore listener
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_TOPICS', payload: [] });
      dispatch({ type: 'SET_STREAK', payload: 0 });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });

    // Initial streak load
    getStudyStreak(user.uid).then(s => dispatch({ type: 'SET_STREAK', payload: s }));
    const unsub = subscribeToTopics(user.uid, (topics) => {
      dispatch({ type: 'SET_TOPICS', payload: topics });
    });
    return () => unsub();
  }, [user]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const addTopic = (data) => createTopic(user.uid, data);

  const editTopic = (topicId, data) => updateTopic(user.uid, topicId, data);

  const removeTopic = (topicId) => deleteTopic(user.uid, topicId);

  const logSession = async (topicId, sessionData) => {
    await logPerformance(user.uid, topicId, sessionData);
    const { currentStreak } = await logStudyActivity(user.uid);
    dispatch({ type: 'SET_STREAK', payload: currentStreak });
  };

  const getTopicById = (id) => state.topics.find((t) => t.id === id);

  const getChildTopics = (parentId) =>
    state.topics.filter((t) => t.parentId === parentId);

  const getRootTopics = () =>
    state.topics.filter((t) => !t.parentId);

  const value = {
    ...state,
    addTopic,
    editTopic,
    removeTopic,
    logSession,
    getTopicById,
    getChildTopics,
    getRootTopics,
  };

  return <TopicContext.Provider value={value}>{children}</TopicContext.Provider>;
};

export const useTopics = () => {
  const ctx = useContext(TopicContext);
  if (!ctx) throw new Error('useTopics must be used inside TopicProvider');
  return ctx;
};
