// aiClient.js - Low-level API client
// Responsible for: fetch logic, headers, error handling
// Used by: aiService.js

const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Make a request to Groq API
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Configuration options
 * @param {string} options.model - Model name (default: llama-3.1-8b-instant)
 * @param {number} options.temperature - Temperature (default: 0.7)
 * @param {number} options.max_tokens - Max tokens (default: 300)
 * @returns {Promise<string>} The response content
 */
export const callGroqAPI = async (prompt, options = {}) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Groq API key not configured. Set VITE_GROQ_API_KEY in .env');
  }

  const {
    model = 'llama-3.1-8b-instant',
    temperature = 0.7,
    max_tokens = 300,
  } = options;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error('Groq API Error:', errorMsg, data);
      throw new Error(`AI model error: ${errorMsg}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in Groq response:', data);
      throw new Error('Empty response from Groq API');
    }

    return content;
  } catch (error) {
    console.error('Groq API call failed:', error);
    throw error;
  }
};
