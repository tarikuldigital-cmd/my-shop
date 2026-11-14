/* Pure defaults (no store import, so db.js can use them without a circular import). */
export const PRESETS = {
  groq: { label: 'Groq', free: true, baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', keyUrl: 'https://console.groq.com/keys', note: 'দ্রুত; ফ্রি টায়ারে মিনিট/দিনপ্রতি লিমিট আছে' },
  gemini: { label: 'Google Gemini', free: true, baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey', note: 'Google AI Studio থেকে ফ্রি key; মডেলের নাম বদলালে এখানে ঠিক করুন' },
  openrouter: { label: 'OpenRouter', free: true, baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free', keyUrl: 'https://openrouter.ai/keys', note: '":free" শেষে থাকা মডেল ফ্রি; দিনে অল্প রিকোয়েস্ট' },
  openai: { label: 'OpenAI', free: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', keyUrl: 'https://platform.openai.com/api-keys', note: 'পেইড' },
  custom: { label: 'Custom (OpenAI-compatible)', free: false, baseUrl: '', model: '', keyUrl: '', note: 'যেকোনো OpenAI-compatible API' },
}

export const defaultChat = () => ({
  mode: 'local', // off | local | relay | direct
  provider: 'groq', baseUrl: PRESETS.groq.baseUrl, model: PRESETS.groq.model, apiKey: '', relayUrl: '',
  agentName: 'Fatiha Ayat Salah Chair সহকারী',
  greeting: 'আসসালামু আলাইকুম! 👋 আমি Fatiha Ayat Salah Chair-এর সহকারী। সালাহ চেয়ারের কালার, দাম বা ডেলিভারি নিয়ে যেকোনো প্রশ্ন করুন।',
  instructions: '',
  suggestions: ['সালাহ চেয়ারের দাম কত?', 'কোন কোন কালার আছে?', 'ডেলিভারি চার্জ কত?', 'কিভাবে অর্ডার করব?'],
})

