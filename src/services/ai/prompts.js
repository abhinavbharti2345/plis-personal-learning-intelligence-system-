// prompts.js - Prompt templates
// Responsible for: storing all prompts as reusable functions
// Used by: aiService.js

/**
 * Generate a prompt for study plan creation
 * @param {Array} topics - Array of topic objects with id, title, description
 * @param {Object} context - Context object with userId, date, currentPlans, etc.
 * @returns {string} Formatted prompt
 */
export const generateStudyPlanPrompt = (topics, context) => {
  const topicList = topics
    .map((t) => `- ${t.title}${t.description ? ': ' + t.description : ''}`)
    .join('\n');

  const contextStr = typeof context === 'object' ? JSON.stringify(context) : context;

  return `You are an expert AI study coach.

Create a focused, actionable daily study plan.

TOPICS:
${topicList}

CONTEXT:
${contextStr}

OUTPUT:
- Time-blocked schedule (format: HH:MM - Topic: Task)
- Prioritize hardest topics first
- Include 15-min breaks every 2 hours
- Maximum 8 study hours
- Keep tasks concise and specific
- Include a brief rationale for the order

Be practical and realistic.`;
};

/**
 * Generate a prompt for reflection analysis
 * @param {string} text - The reflection text to analyze
 * @returns {string} Formatted prompt
 */
export const analyzeReflectionPrompt = (text) => {
  return `You are an AI productivity coach and learning mentor.

Analyze this student reflection and provide actionable insights.

REFLECTION:
"${text}"

OUTPUT:
Provide 3-5 key insights in this format:
1. [Insight]: [Specific observation]
2. [Improvement]: [Actionable suggestion]
3. [Pattern]: [Trend or pattern noticed]
4. [Recommendation]: [Next step]
5. [Encouragement]: [Motivational note]

Be concise, specific, and constructive. Focus on patterns and growth opportunities.`;
};

/**
 * Generate a prompt for weekly plan creation
 * @param {Array} topics - Topics to plan for
 * @param {Object} context - Weekly context
 * @returns {string} Formatted prompt
 */
export const generateWeeklyPlanPrompt = (topics, context) => {
  const topicList = topics
    .map((t) => `- ${t.title}`)
    .join('\n');

  const contextStr = typeof context === 'object' ? JSON.stringify(context) : context;

  return `You are an expert study planner.

Create a balanced weekly study plan.

TOPICS:
${topicList}

CONTEXT:
${contextStr}

OUTPUT:
- Distribute topics across Monday-Sunday
- Balance difficulty throughout the week
- Include recovery/review days
- Format: [Day]: [Topic] - [Primary Focus]
- Suggest 4-6 study hours per day

Make it sustainable and progressive.`;
};

/**
 * Generate a prompt for monthly plan creation
 * @param {Array} topics - Topics to plan for
 * @param {Object} context - Monthly context
 * @returns {string} Formatted prompt
 */
export const generateMonthlyPlanPrompt = (topics, context) => {
  const topicList = topics
    .map((t) => `- ${t.title}`)
    .join('\n');

  const contextStr = typeof context === 'object' ? JSON.stringify(context) : context;

  return `You are a learning strategist.

Create a comprehensive monthly learning roadmap.

TOPICS:
${topicList}

CONTEXT:
${contextStr}

OUTPUT:
- Organize into 4 weeks
- Week 1: Foundational concepts
- Week 2: Deep learning
- Week 3: Application and practice
- Week 4: Consolidation and review
- Include milestones for each week
- Format: Week N (Topic): Goal - Key Activities

Make it progressive and achievable.`;
};
