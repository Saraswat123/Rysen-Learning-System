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

  const MEET_URL = 'https://meet.google.com/ruz-exjr-wru'

  // 2. North Campus Meeting (1st & 3rd Monday)
  const northMeeting = await db.resource.findFirst({
    where: { title: { contains: '1st & 3rd Monday' } },
  })
  if (!northMeeting) {
    await db.resource.create({
      data: {
        title: 'Weekly Meeting — 1st & 3rd Monday (North Campus)',
        description: 'Every Monday 4:30 PM – 5:30 PM | 1st & 3rd week at North Campus · Google Meet',
        url: MEET_URL,
        type: 'LINK',
        category: 'Meetings',
        isPublished: true,
        isPinned: false,
        groupId: group?.id ?? null,
      },
    })
    results.push('✓ North Campus meeting created')
  } else {
    await db.resource.update({ where: { id: northMeeting.id }, data: { url: MEET_URL } })
    results.push('✓ North Campus meeting URL updated')
  }

  // 3. South Campus Meeting (2nd & 4th Monday)
  const southMeeting = await db.resource.findFirst({
    where: { title: { contains: '2nd & 4th Monday' } },
  })
  if (!southMeeting) {
    await db.resource.create({
      data: {
        title: 'Weekly Meeting — 2nd & 4th Monday (South Campus)',
        description: 'Every Monday 4:30 PM – 5:30 PM | 2nd & 4th week at South Campus · Google Meet',
        url: MEET_URL,
        type: 'LINK',
        category: 'Meetings',
        isPublished: true,
        isPinned: false,
        groupId: group?.id ?? null,
      },
    })
    results.push('✓ South Campus meeting created')
  } else {
    await db.resource.update({ where: { id: southMeeting.id }, data: { url: MEET_URL } })
    results.push('✓ South Campus meeting URL updated')
  }

  return NextResponse.json({
    ok: true,
    groupFound: group ? group.name : 'none — resources created as global',
    results,
  })
}
