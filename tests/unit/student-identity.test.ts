import { describe, expect, it } from 'vitest'
import { cleanText, matchStudents, parseClass } from '@/lib/student-identity'

const saved = (name: string, cls: string, section: string, id = name) => ({ id, name, class: cls, section })
const ids = (r: { id: string }[]) => r.map((s) => s.id)

describe('cleanText', () => {
  it('trims, collapses spaces and drops invisible characters', () => {
    expect(cleanText('  OJAS    SHARMA​ ')).toBe('OJAS SHARMA')
  })
})

describe('parseClass', () => {
  it('treats the common spellings as one class', () => {
    for (const v of ['6', '06', '6th', '6 th', 'Class 6', 'class-6', 'Grade 6', 'Std. 6', 'VI', 'vi']) {
      expect(parseClass(v).cls, v).toBe('6')
    }
  })
  it('splits a section written into the class', () => {
    for (const v of ['6B', '6-B', '6 b', '6th B', 'VI-B']) expect(parseClass(v), v).toEqual({ cls: '6', section: 'b' })
  })
  it('leaves other class names alone', () => {
    expect(parseClass('LKG')).toEqual({ cls: 'lkg', section: '' })
    expect(parseClass('Nursery').cls).toBe('nursery')
  })
})

describe('matchStudents', () => {
  const typed = { name: 'ojas sharma', class: '6', section: 'B' }

  it('matches regardless of case, spacing and class spelling', () => {
    expect(ids(matchStudents([saved('OJAS  SHARMA', 'VI', 'b', 'a')], typed))).toEqual(['a'])
    expect(ids(matchStudents([saved('Ojas Sharma', '6-B', '', 'b')], typed))).toEqual(['b'])
    expect(ids(matchStudents([saved('Ojas Sharma', '6th', 'Section B', 'c')], typed))).toEqual(['c'])
  })

  it('still requires the full name, the right class and the right section', () => {
    expect(matchStudents([saved('Ojas Sharma', '6', 'B')], { ...typed, name: 'Ojas' })).toEqual([])
    expect(matchStudents([saved('Ojas Sharma', '7', 'B')], typed)).toEqual([])
    expect(matchStudents([saved('Ojas Sharma', '6', 'A')], typed)).toEqual([])
  })

  it('prefers the exact section over a record with no section', () => {
    const roster = [saved('Ojas Sharma', '6', '', 'blank'), saved('Ojas Sharma', '6', 'B', 'exact')]
    expect(ids(matchStudents(roster, typed))).toEqual(['exact'])
  })

  it('matches any section when the student leaves it empty', () => {
    expect(ids(matchStudents([saved('Ojas Sharma', '6', 'A', 'a')], { ...typed, section: '' }))).toEqual(['a'])
  })
})
