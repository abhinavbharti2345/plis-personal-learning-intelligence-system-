const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const parseJsonResponse = (rawText) => {
  const direct = rawText.trim();
  if (direct.startsWith('{') || direct.startsWith('[')) {
    return JSON.parse(direct);
  }

  const fenced = direct.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1]);

  const anyJson = direct.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (anyJson?.[1]) return JSON.parse(anyJson[1]);

  throw new Error('Failed to parse Groq JSON response.');
};

const callGroq = async ({ apiKey, prompt, model = 'llama-3.1-8b-instant', temperature = 0.4, max_tokens = 500 }) => {
  if (!apiKey) {
    throw new Error('Groq API key is missing in Functions environment.');
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI model error: check model name - ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned an empty response.');

  return text;
};

export const callGroqJson = async ({ apiKey, prompt, generationConfig = {} }) => {
  const text = await callGroq({
    apiKey,
    prompt,
    temperature: generationConfig.temperature ?? 0.4,
    max_tokens: generationConfig.maxOutputTokens ?? 500,
  });

  return parseJsonResponse(text);
};

export const callGroqText = async ({ apiKey, prompt, generationConfig = {} }) => {
  return callGroq({
    apiKey,
    prompt,
    temperature: generationConfig.temperature ?? 0.4,
    max_tokens: generationConfig.maxOutputTokens ?? 500,
  });
};
