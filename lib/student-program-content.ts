export type StudentProgramContentInput =
  | { type: 'TEXT'; title: string; body: string; url: null; order: number }
  | { type: 'VIDEO'; title: string; body: null; url: string; order: number }

export class StudentProgramContentError extends Error {}

export function parseStudentProgramContent(value: unknown): StudentProgramContentInput[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new StudentProgramContentError('Lessons must be a list of at most 50 items')
  }

  return value.map((raw, order) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new StudentProgramContentError('Invalid lesson')
    }
    const item = raw as Record<string, unknown>
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    if (!title || title.length > 160) throw new StudentProgramContentError('Lesson title is required (160 characters max)')

    if (item.type === 'TEXT') {
      const body = typeof item.body === 'string' ? item.body.trim() : ''
      if (!body || body.length > 20000) throw new StudentProgramContentError('Text lesson must contain up to 20,000 characters')
      return { type: 'TEXT', title, body, url: null, order }
    }

    if (item.type === 'VIDEO') {
      const url = typeof item.url === 'string' ? item.url.trim() : ''
      try {
        if (new URL(url).protocol !== 'https:') throw new Error()
      } catch {
        throw new StudentProgramContentError('Video must use a valid HTTPS link')
      }
      if (url.length > 2048) throw new StudentProgramContentError('Video link is too long')
      return { type: 'VIDEO', title, body: null, url, order }
    }

    throw new StudentProgramContentError('Lesson type must be TEXT or VIDEO')
  })
}
