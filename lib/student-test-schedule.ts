/** Convert an API timestamp to the local value expected by datetime-local inputs. */
export function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/** Interpret a datetime-local value in the user's timezone before sending it to the API. */
export function toUtcDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

export function testScheduleError(startAt: string, endAt: string): string | null {
  const start = startAt ? new Date(startAt).getTime() : null
  const end = endAt ? new Date(endAt).getTime() : null
  if ((start !== null && Number.isNaN(start)) || (end !== null && Number.isNaN(end))) {
    return 'Enter a valid opening and closing time.'
  }
  if (start !== null && end !== null && end <= start) {
    return 'Closing time must be after opening time.'
  }
  return null
}
