export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Find North South group (flexible name match)
  const group = await db.educatorGroup.findFirst({
    where: { name: { contains: 'North', mode: 'insensitive' } },
  })

  const results: string[] = []

  // 1. STEM Educator Module SOP Document
  const sopExists = await db.resource.findFirst({
    where: { url: { contains: '1sk6_PxrdEEvx_ZOaSmAO8qcAgBIVxeBkTYAmAlBip-A' } },
  })
  if (!sopExists) {
    await db.resource.create({
      data: {
        title: 'STEM Educator Module — SOP',
        description: 'Standard Operating Procedure for STEM educators. Read before starting module delivery.',
        url: 'https://docs.google.com/document/d/1sk6_PxrdEEvx_ZOaSmAO8qcAgBIVxeBkTYAmAlBip-A/edit?usp=sharing',
        type: 'DOC',
        category: 'Training',
        isPublished: true,
        isPinned: true,
        groupId: group?.id ?? null,
      },
    })
    results.push('✓ STEM Educator Module SOP created')
  } else {
    results.push('— SOP doc already exists')
  }

  // 2. North Campus Meeting (1st & 3rd Monday)
  const northMeetingExists = await db.resource.findFirst({
    where: { title: { contains: '1st & 3rd Monday' } },
  })
  if (!northMeetingExists) {
    await db.resource.create({
      data: {
        title: 'Weekly Meeting — 1st & 3rd Monday (North Campus)',
        description: 'Every Monday 4:30 PM – 5:30 PM | 1st & 3rd week of month at North Campus',
        url: null,
        type: 'LINK',
        category: 'Meetings',
        isPublished: true,
        isPinned: false,
        groupId: group?.id ?? null,
      },
    })
    results.push('✓ North Campus meeting resource created')
  } else {
    results.push('— North meeting already exists')
  }

  // 3. South Campus Meeting (2nd & 4th Monday)
  const southMeetingExists = await db.resource.findFirst({
    where: { title: { contains: '2nd & 4th Monday' } },
  })
  if (!southMeetingExists) {
    await db.resource.create({
      data: {
        title: 'Weekly Meeting — 2nd & 4th Monday (South Campus)',
        description: 'Every Monday 4:30 PM – 5:30 PM | 2nd & 4th week of month at South Campus',
        url: null,
        type: 'LINK',
        category: 'Meetings',
        isPublished: true,
        isPinned: false,
        groupId: group?.id ?? null,
      },
    })
    results.push('✓ South Campus meeting resource created')
  } else {
    results.push('— South meeting already exists')
  }

  return NextResponse.json({
    ok: true,
    groupFound: group ? group.name : 'none — resources created as global',
    results,
  })
}
