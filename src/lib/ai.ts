import { google } from '@ai-sdk/google'

// Uses GOOGLE_GENERATIVE_AI_API_KEY from environment automatically
// Get your key at: https://aistudio.google.com/apikey
export const geminiModel = google('gemini-3-flash-preview')
