import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_GROQ_MODEL, selectedGroqModel } from '@/lib/ai-model'

const original = process.env.RYSEN_AI_MODEL

afterEach(() => {
  if (original === undefined) delete process.env.RYSEN_AI_MODEL
  else process.env.RYSEN_AI_MODEL = original
})

describe('Rysen AI model selection', () => {
  it('uses the current Groq model by default', () => {
    delete process.env.RYSEN_AI_MODEL
    expect(selectedGroqModel()).toBe(DEFAULT_GROQ_MODEL)
  })

  it('uses an explicitly configured model', () => {
    process.env.RYSEN_AI_MODEL = ' openai/gpt-oss-20b '
    expect(selectedGroqModel()).toBe('openai/gpt-oss-20b')
  })
})
