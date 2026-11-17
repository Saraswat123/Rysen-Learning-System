export type AiChatMessage = { role: 'user' | 'assistant'; content: string }

export class AiChatInputError extends Error {}

// The browser sends plain chat text. Never let a caller supply system or tool
// messages to a privileged agent, and bound the history sent to the model.
export function parseAiChatHistory(body: unknown): AiChatMessage[] {
  if (!body || typeof body !== 'object' || !('messages' in body)) {
    throw new AiChatInputError('Messages are required')
  }
  const messages = body.messages
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
    throw new AiChatInputError('Invalid message count')
  }
  const checked = messages.map((message): AiChatMessage => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      throw new AiChatInputError('Invalid message')
    }
    const { role, content } = message as Record<string, unknown>
    if (role !== 'user' && role !== 'assistant') {
      throw new AiChatInputError('Invalid message role')
    }
    if (typeof content !== 'string' || !content.trim() || content.length > 4000) {
      throw new AiChatInputError('Invalid message content')
    }
    return { role, content }
  })
  if (checked.at(-1)?.role !== 'user') {
    throw new AiChatInputError('The last message must be from the user')
  }
  return checked.slice(-12)
}
