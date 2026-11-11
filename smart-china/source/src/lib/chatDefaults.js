/* Pure defaults (no store import, so db.js can use them without a circular import). */
export const PRESETS = {
  groq: { label: 'Groq', free: true, baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', keyUrl: 'https://console.groq.com/keys', note: 'Fast; the free tier has per-minute / per-day limits' },
  gemini: { label: 'Google Gemini', free: true, baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey', note: 'Free key from Google AI Studio; update the model name here if it changes' },
  openrouter: { label: 'OpenRouter', free: true, baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free', keyUrl: 'https://openrouter.ai/keys', note: 'Models ending in ":free" cost nothing; few requests per day' },
  openai: { label: 'OpenAI', free: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', keyUrl: 'https://platform.openai.com/api-keys', note: 'Paid' },
  custom: { label: 'Custom (OpenAI-compatible)', free: false, baseUrl: '', model: '', keyUrl: '', note: 'Any OpenAI-compatible API' },
}

export const defaultChat = () => ({
  mode: 'local', // off | local | relay | direct
  provider: 'groq', baseUrl: PRESETS.groq.baseUrl, model: PRESETS.groq.model, apiKey: '', relayUrl: '',
  agentName: 'Smart China Gallery assistant',
  greeting: 'Hi! 👋 I am the Smart China Gallery assistant. Ask me about any product, price, colour/size, delivery charge or your order.',
  instructions: '',
  suggestions: ['Smart watch price?', 'Do you have room heaters?', 'What is the delivery charge?', 'Is cash on delivery available?'],
})
