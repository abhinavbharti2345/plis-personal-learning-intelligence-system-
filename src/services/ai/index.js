// ai/index.js - Barrel export for AI service
// Allows: import { generateStudyPlan } from '@/services/ai'

export {
  generateStudyPlan,
  analyzeReflection,
  generateDailyPlan,
  generateWeeklyPlan,
  generateMonthlyPlan,
  generatePlan,
} from './aiService.js';
