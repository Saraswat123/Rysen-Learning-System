/** One model selection point for Rysen AI's Groq-backed application routes. */
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'

export function selectedGroqModel(): string {
  return process.env.RYSEN_AI_MODEL?.trim() || DEFAULT_GROQ_MODEL
}
