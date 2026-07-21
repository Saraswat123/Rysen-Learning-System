export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

const STEM_EMAILS = [
  'inderpreetkaur160@gmail.com',
  'soni.sunny86@gmail.com',
  'rj1871@gmail.com',
  'yogeshpradhnani99@gmail.com',
  'nishabharti9721@gmail.com',
  'hiteshlalwani3060@gmail.com',
  'rajeev663257912702@gmail.com',
  'piyushchoudhary0021@gmail.com',
  'mauryatarun495@gmail.com',
]

export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Find educators by email
  const educators = await db.user.findMany({
    where: { email: { in: STEM_EMAILS }, isActive: true },
    select: { id: true, name: true, email: true },
  })

  const notFound = STEM_EMAILS.filter((e) => !educators.find((u) => u.email === e))

  // Create or update STEM Educator group
  const existingGroup = await db.educatorGroup.findFirst({ where: { name: 'STEM Educators' } })

  let group
  if (existingGroup) {
    // Replace members
    await db.educatorGroupMember.deleteMany({ where: { groupId: existingGroup.id } })
    await db.educatorGroupMember.createMany({
      data: educators.map((e) => ({ groupId: existingGroup.id, userId: e.id })),
      skipDuplicates: true,
    })
    group = existingGroup
  } else {
    group = await db.educatorGroup.create({
      data: {
        name: 'STEM Educators',
        description: 'STEM subject educators across all campuses',
        color: '#225632',
        members: { create: educators.map((e) => ({ userId: e.id })) },
      },
    })
  }

  // Create the task
  const deadline = new Date('2026-07-25T23:59:59.000Z')

  const task = await db.task.create({
    data: {
      title: 'Completion of STEM Classes – July Month Update',
      description: 'Update the STEM Computer class-wise data for July month. Ensure all class completion data is filled in the sheet accurately and up to date.',
      notes: 'Fill in computer class data campus-wise. Mark completed classes, pending classes and any gaps. Data must reflect status as of July 25.',
      priority: 'HIGH',
      deadline,
      createdById: user.id,
      assignments: {
        create: educators.map((e) => ({ userId: e.id })),
      },
    },
  })

  // Add Google Sheet as resource
  await db.taskResource.create({
    data: {
      taskId: task.id,
      type: 'URL',
      title: 'STEM Classes – July Data Sheet',
      url: 'https://docs.google.com/spreadsheets/d/1edGiguTBuUUV6jwQy0xSEHiUNbH5VGKjGvpzj7UThlA/edit?usp=sharing',
      description: 'Fill in class-wise STEM completion data for July. Update your campus rows.',
    },
  })

  // In-app notifications
  await db.notification.createMany({
    data: educators.map((e) => ({
      userId: e.id,
      title: 'New Task: STEM Classes July Update',
      message: `You have been assigned a HIGH priority task due 25 July. Please update the STEM class data sheet.`,
      type: 'TASK',
      relatedId: task.id,
    })),
  })

  return NextResponse.json({
    ok: true,
    group: { id: group.id, name: 'STEM Educators', members: educators.length },
    task: { id: task.id, title: task.title, deadline: '25 July 2026' },
    resource: 'STEM Classes – July Data Sheet (Google Sheet linked)',
    assigned: educators.map((e) => e.name),
    notFound: notFound.length > 0 ? notFound : undefined,
  })
}
