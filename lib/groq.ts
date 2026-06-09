import Groq from 'groq-sdk'

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function getAIInsights(prompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are an educational analytics assistant for RYSEN Learning Centre. Analyze teacher training data and provide actionable insights. Be concise and specific.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 800,
  })
  return completion.choices[0]?.message?.content ?? 'No insights available.'
}
