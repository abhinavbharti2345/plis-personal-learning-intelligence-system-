export const buildStudyCoachPrompt = (payload) => {
  const { topics = [], todayTasks = [] } = payload;
  return [
    'You are an expert study coach. Return JSON only.',
    'Goal: create a focused and realistic study plan for today.',
    'Rules:',
    '- Prioritize weak and learning topics.',
    '- Return 3 to 5 tasks.',
    '- Each task must include topicId, title, reason, startTime (HH:mm), endTime (HH:mm), and priority (high|medium|low).',
    '- Keep total workload realistic for one day.',
    '- Include a short explanation string.',
    'Output schema:',
    '{"explanation":"string","tasks":[{"topicId":"string","title":"string","reason":"string","startTime":"09:00","endTime":"10:00","priority":"high"}]}',
    `Topics: ${JSON.stringify(topics)}`,
    `Today planner tasks: ${JSON.stringify(todayTasks)}`,
  ].join('\n');
};

export const buildReflectionPrompt = (payload) => {
  const { reflectionText, recentReflections = [] } = payload;
  return [
    'You are a concise and motivating reflection coach. Return JSON only.',
    'Analyze reflection and return short actionable insights.',
    'Rules:',
    '- Identify problems and patterns.',
    '- Suggest 2 to 3 practical actions.',
    '- Keep tone supportive and concise.',
    '- Return 2 to 4 insights.',
    'Output schema:',
    '{"insights":[{"text":"string","severity":"warning|info|success","plannerAction":"string"}]}',
    `Latest reflection: ${reflectionText}`,
    `Recent reflections: ${JSON.stringify(recentReflections)}`,
  ].join('\n');
};

export const buildPlannerPrompt = (payload) => {
  const { mode, topics = [], currentPlans = [] } = payload;
  return [
    'You are a study planner assistant. Return JSON only.',
    `Mode: ${mode}.`,
    'Generate a realistic plan using available topics and avoid overloaded schedules.',
    'Output schema by mode:',
    '- daily: {"items":[{"topicId":"string","title":"string","notes":"string","startTime":"09:00","endTime":"10:00"}]}',
    '- weekly: {"items":[{"topicId":"string","day":"Monday","notes":"string"}]}',
    '- monthly: {"items":[{"topicId":"string","title":"string","target":"string"}]}',
    `Topics: ${JSON.stringify(topics)}`,
    `Existing plan entries: ${JSON.stringify(currentPlans)}`,
  ].join('\n');
};

export const buildGeneratePlanPrompt = ({ topics = [], context = {}, mode = 'daily' }) => {
  return `
You are a smart AI study coach.

Create a focused ${mode} study plan.

INPUT:
Topics: ${JSON.stringify(topics)}
Context: ${JSON.stringify(context)}

OUTPUT FORMAT:

* Time-blocked schedule
* Priority topics first
* Include breaks
* Keep it realistic (max 6-8 hours)

Keep response:

* Short
* Actionable
* No unnecessary explanation

Return ONLY valid JSON with this schema:
{
  "planText": "short schedule summary",
  "items": [
    {
      "topicId": "string",
      "title": "string",
      "notes": "string",
      "startTime": "HH:mm",
      "endTime": "HH:mm"
    }
  ]
}
`;
};
