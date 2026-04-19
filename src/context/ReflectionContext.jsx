// ReflectionContext.jsx — Global reflections + insights state
import { createContext, useContext, useEffect, useReducer } from 'react';
import { useAuth } from './AuthContext';
import {
  saveReflection,
  subscribeToReflections,
} from '../services/reflectionService';
import { detectKeywords } from '../utils/keywordDetector';

const initialState = {
  reflections: [],
  loading: true,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_REFLECTIONS':
      return { ...state, reflections: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const ReflectionContext = createContext(null);

export const ReflectionProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!user) { dispatch({ type: 'SET_REFLECTIONS', payload: [] }); return; }
    dispatch({ type: 'SET_LOADING', payload: true });
    const unsub = subscribeToReflections(user.uid, (r) =>
      dispatch({ type: 'SET_REFLECTIONS', payload: r })
    );
    return () => unsub();
  }, [user]);

  const addReflection = async (content) => {
    const { keywords, sentiment } = detectKeywords(content);
    await saveReflection(user.uid, content, keywords, sentiment);
  };

  const value = { ...state, addReflection };
  return (
    <ReflectionContext.Provider value={value}>
      {children}
    </ReflectionContext.Provider>
  );
};

export const useReflections = () => {
  const ctx = useContext(ReflectionContext);
  if (!ctx) throw new Error('useReflections must be inside ReflectionProvider');
  return ctx;
};
