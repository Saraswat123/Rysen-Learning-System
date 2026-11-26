// One definition of "the same student details", shared by every save path and by
// student login, so spacing or class spelling can never lock a student out.

const INVISIBLE = /[​-‍⁠﻿]/g

const ROMAN: Record<string, string> = {
  i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6',
  vii: '7', viii: '8', ix: '9', x: '10', xi: '11', xii: '12',
}

/** Trim, collapse repeated spaces, drop invisible characters. Keeps the original case. */
export function cleanText(value: string): string {
  return value.normalize('NFKC').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim()
}

export const nameKey = (name: string) => cleanText(name).toLowerCase()

/**
 * "6", "6th", "Class 6", "VI" and "06" are the same class. A section written into
 * the class field ("6B", "6-B") is split out. Other values (LKG, Nursery) pass through.
 */
export function parseClass(value: string): { cls: string; section: string } {
  const raw = cleanText(value).toLowerCase().replace(/^(class|grade|std\.?|standard)\s*[-:]?\s*/, '')
  const numeric = raw.match(/^0*(\d{1,2})\s*(?:st|nd|rd|th)?(?:\s*[-/ ]?\s*([a-z]))?$/)
  if (numeric) return { cls: numeric[1], section: numeric[2] ?? '' }
  const roman = raw.match(/^([ivx]+)(?:\s*[-/ ]\s*([a-z]))?$/)
  if (roman && ROMAN[roman[1]]) return { cls: ROMAN[roman[1]], section: roman[2] ?? '' }
  return { cls: raw, section: '' }
}

export const sectionKey = (section: string) =>
  cleanText(section).toLowerCase().replace(/^(section|sec\.?)\s*[-:]?\s*/, '')

type Identity = { name: string; class: string; section: string }

/**
 * Students whose saved details match what was typed. Name (full) and class must
 * match. A typed section must match the saved one; records saved without a section
 * accept any, and are used only when no record matches the section exactly.
 */
export function matchStudents<T extends Identity>(students: T[], typed: Identity): T[] {
  const name = nameKey(typed.name)
  const wantedClass = parseClass(typed.class)
  const wantedSection = sectionKey(typed.section) || wantedClass.section

  const exact: T[] = []
  const noSection: T[] = []
  for (const student of students) {
    if (nameKey(student.name) !== name) continue
    const saved = parseClass(student.class)
    if (saved.cls !== wantedClass.cls) continue
    const savedSection = sectionKey(student.section) || saved.section
    if (!wantedSection || savedSection === wantedSection) exact.push(student)
    else if (!savedSection) noSection.push(student)
  }
  return exact.length > 0 ? exact : noSection
}
