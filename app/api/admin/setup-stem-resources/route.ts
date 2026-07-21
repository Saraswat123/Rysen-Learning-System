export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

const STEM_RESOURCES = [
  {
    title: 'STEM Data',
    description: 'Campus-wise STEM class completion and student data',
    url: 'https://docs.google.com/spreadsheets/d/1edGiguTBuUUV6jwQy0xSEHiUNbH5VGKjGvpzj7UThlA/edit?usp=sharing',
    type: 'SHEET',
    category: 'STEM',
    isPinned: true,
  },
  {
    title: 'STEM Curriculum',
    description: 'STEM curriculum plan and topic coverage for 2026-27',
    url: 'https://docs.google.com/spreadsheets/d/1qgxdq3GH7Jg0am0eontWkEJ8UFBRhxOaO6m_R7P54VM/edit?usp=sharing',
    type: 'SHEET',
    category: 'STEM',
    isPinned: false,
  },
  {
    title: 'STEM Materials',
    description: 'Teaching materials, resources and reference documents',
    url: 'https://docs.google.com/spreadsheets/d/1sby6o4t8dZdVrv0xB54tdGHorndyCcj2H-ZuakV1yXE/edit?usp=sharing',
    type: 'SHEET',
    category: 'STEM',
    isPinned: false,
  },
  {
    title: 'R&D 2026-27',
    description: 'Research and development plan for academic year 2026-27. Add link via Edit.',
    url: '',
    type: 'DRIVE',
    category: 'R&D',
    isPinned: false,
  },
]

export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const results = []
  for (const r of STEM_RESOURCES) {
    try {
      const existing = await db.resource.findFirst({ where: { title: r.title, category: r.category } })
      if (existing) {
        results.push({ title: r.title, status: 'skipped (already exists)' })
        continue
      }
      await db.resource.create({
        data: {
          title: r.title,
          description: r.description,
          url: r.url || null,
          type: r.type,
          category: r.category,
          isPublished: true,
          isPinned: r.isPinned,
          branchId: null,
        },
      })
      results.push({ title: r.title, status: 'created' })
    } catch (e) {
      results.push({ title: r.title, status: `error: ${String(e)}` })
    }
  }

  return NextResponse.json({ ok: true, results })
}
