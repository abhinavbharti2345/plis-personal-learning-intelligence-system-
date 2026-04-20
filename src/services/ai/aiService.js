// aiService.js - High-level AI service layer
// Responsible for: rate limiting, caching, response parsing, error handling
// Used by: UI components, pages

import { callGroqAPI } from './aiClient.js';
import {
  generateStudyPlanPrompt,
  analyzeReflectionPrompt,
  generateWeeklyPlanPrompt,
  generateMonthlyPlanPrompt,
} from './prompts.js';

// Rate limiting
let lastCallTime = 0;
const RATE_LIMIT_MS = 3000; // 3 seconds between calls

// Caching
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Cache helper - read from localStorage
 */
const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const { value, createdAt } = JSON.parse(raw);
    if (!value || !createdAt) return null;

    if (Date.now() - createdAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return value;
  } catch {
    return null;
  }
};

/**
 * Cache helper - write to localStorage
 */
const writeCache = (key, value) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        value,
        createdAt: Date.now(),
      })
    );
  } catch {
    // Silently fail on quota exceeded or private mode
  }
};

/**
 * Rate limit check - prevent spam
 */
const checkRateLimit = () => {
  const now = Date.now();
  if (now - lastCallTime < RATE_LIMIT_MS) {
    throw new Error('Please wait a moment before generating another plan');
  }
  lastCallTime = now;
};

/**
 * Generate study plan for dashboard
 * @param {Array} topics - Array of topic objects
 * @param {Object} context - Context object (userId, date, currentPlans, etc.)
 * @returns {Promise<string>} Generated study plan text
 */
export const generateStudyPlan = async (topics, context) => {
  if (!topics || topics.length === 0) {
    throw new Error('No topics provided');
  }

  const cacheKey = `study_plan_${JSON.stringify({ topics, context })}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  checkRateLimit();

  const prompt = generateStudyPlanPrompt(topics, context);

  try {
    const result = await callGroqAPI(prompt, {
      temperature: 0.7,
      max_tokens: 400,
    });

    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(`Failed to generate study plan: ${error.message}`);
  }
};

/**
 * Analyze reflection text
 * @param {string} text - Reflection text to analyze
 * @returns {Promise<string>} Analysis and insights
 */
export const analyzeReflection = async (text) => {
  if (!text || text.trim().length === 0) {
    throw new Error('Reflection text cannot be empty');
  }

  const cacheKey = `reflection_${text}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  checkRateLimit();

  const prompt = analyzeReflectionPrompt(text);

  try {
    const result = await callGroqAPI(prompt, {
      temperature: 0.7,
      max_tokens: 300,
    });

    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(`Failed to analyze reflection: ${error.message}`);
  }
};

/**
 * Generate daily study plan
 * @param {Array} topics - Topics to plan
 * @param {Object} context - Daily context
 * @returns {Promise<string>} Daily plan
 */
export const generateDailyPlan = async (topics, context) => {
  if (!topics || topics.length === 0) {
    throw new Error('No topics provided');
  }

  const cacheKey = `daily_plan_${JSON.stringify({ topics, context })}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  checkRateLimit();

  const prompt = generateStudyPlanPrompt(topics, context);

  try {
    const result = await callGroqAPI(prompt, {
      temperature: 0.7,
      max_tokens: 500,
    });

    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(`Failed to generate daily plan: ${error.message}`);
  }
};

/**
 * Generate weekly study plan
 * @param {Array} topics - Topics to plan
 * @param {Object} context - Weekly context
 * @returns {Promise<string>} Weekly plan
 */
export const generateWeeklyPlan = async (topics, context) => {
  if (!topics || topics.length === 0) {
    throw new Error('No topics provided');
  }

  const cacheKey = `weekly_plan_${JSON.stringify({ topics, context })}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  checkRateLimit();

  const prompt = generateWeeklyPlanPrompt(topics, context);

  try {
    const result = await callGroqAPI(prompt, {
      temperature: 0.7,
      max_tokens: 600,
    });

    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(`Failed to generate weekly plan: ${error.message}`);
  }
};

/**
 * Generate monthly study plan
 * @param {Array} topics - Topics to plan
 * @param {Object} context - Monthly context
 * @returns {Promise<string>} Monthly plan
 */
export const generateMonthlyPlan = async (topics, context) => {
  if (!topics || topics.length === 0) {
    throw new Error('No topics provided');
  }

  const cacheKey = `monthly_plan_${JSON.stringify({ topics, context })}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  checkRateLimit();

  const prompt = generateMonthlyPlanPrompt(topics, context);

  try {
    const result = await callGroqAPI(prompt, {
      temperature: 0.7,
      max_tokens: 700,
    });

    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(`Failed to generate monthly plan: ${error.message}`);
  }
};

/**
 * Generic plan generator (for backward compatibility)
 * @param {string} mode - 'daily' | 'weekly' | 'monthly'
 * @param {Array} topics - Topics to plan
 * @param {Object} context - Context
 * @returns {Promise<string>} Generated plan
 */
export const generatePlan = async (mode, topics, context) => {
  switch (mode) {
    case 'daily':
      return generateDailyPlan(topics, context);
    case 'weekly':
      return generateWeeklyPlan(topics, context);
    case 'monthly':
      return generateMonthlyPlan(topics, context);
    default:
      throw new Error(`Invalid mode: ${mode}`);
  }
};
