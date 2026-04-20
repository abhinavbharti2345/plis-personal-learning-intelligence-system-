// aiService.js - Backward compatibility barrel export
// Re-exports from modular AI service in /ai directory
// Allows existing code to continue using: import { ... } from '@/services/aiService'

export {
  generateStudyPlan,
  analyzeReflection,
  generateDailyPlan,
  generateWeeklyPlan,
  generateMonthlyPlan,
  generatePlan,
} from './ai/aiService.js';
