import 'dotenv/config'
import { PrismaClient, Role } from '../app/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

const BRANCHES = [
  { name: 'Vyas Colony', location: 'Bikaner' },
  { name: 'Virat Nagar', location: 'Bikaner' },
  { name: 'Deoli - Main', location: 'Deoli' },
  { name: 'Deoli - Preschool', location: 'Deoli' },
  { name: 'Pilibanga', location: 'Sri Ganganagar' },
  { name: 'Sri Ganganagar - Main', location: 'Sri Ganganagar' },
  { name: 'Sri Ganganagar - Preschool', location: 'Sri Ganganagar' },
  { name: 'Sri Vijaynagar', location: 'Sri Ganganagar' },
  { name: 'Nimbahera - Main', location: 'Chittorgarh' },
  { name: 'Nimbahera - Preschool', location: 'Chittorgarh' },
  { name: 'Udaipur', location: 'Udaipur' },
  { name: 'Beawar', location: 'Beawar' },
  { name: 'Beawar NLC 1', location: 'Beawar' },
  { name: 'Beawar NLC 2', location: 'Beawar' },
  { name: 'Jaisalmer', location: 'Jaisalmer' },
]

const STAGES = [
  {
    number: 1,
    title: 'Welcome Week',
    subtitle: 'RYSEN Story & Culture',
    description: 'Onboarding into the RYSEN family — values, vision, and culture.',
    week: 'Week 1',
    badgeTitle: 'RYSEN Pioneer',
    badgeColor: '#033D4C',
    badgeIcon: 'star',
    timeLimitMinutes: 20,
    passScore: 70,
    maxAttempts: 3,
  },
  {
    number: 2,
    title: 'RYSEN Way',
    subtitle: 'Pedagogical Framework',
    description: 'Lesson design standards, assessment philosophy, and classroom norms.',
    week: 'Week 2–3',
    badgeTitle: 'RYSEN Practitioner',
    badgeColor: '#225632',
    badgeIcon: 'book',
    timeLimitMinutes: 30,
    passScore: 70,
    maxAttempts: 3,
  },
  {
    number: 3,
    title: 'Skills Building',
    subtitle: 'Subject Pedagogy & EdTech',
    description: 'Subject-specific pedagogy, differentiation, inclusion, and technology tools.',
    week: 'Week 4 – Month 2',
    badgeTitle: 'RYSEN Educator',
    badgeColor: '#7D783E',
    badgeIcon: 'zap',
    timeLimitMinutes: 35,
    passScore: 70,
    maxAttempts: 3,
  },
  {
    number: 4,
    title: 'Observe & Coach',
    subtitle: 'Classroom Observation',
    description: 'Structured classroom observations, 1:1 coaching, and peer lesson study.',
    week: 'Month 2–3',
    badgeTitle: 'RYSEN Coach',
    badgeColor: '#FECB08',
    badgeIcon: 'eye',
    timeLimitMinutes: 30,
    passScore: 70,
    maxAttempts: 3,
  },
  {
    number: 5,
    title: 'Embed & Grow',
    subtitle: 'Continuous Improvement',
    description: 'Monthly RLC sessions, 360° review, personal PD plan, and leadership pathway.',
    week: 'Ongoing',
    badgeTitle: 'RYSEN Leader',
    badgeColor: '#033D4C',
    badgeIcon: 'award',
    timeLimitMinutes: 25,
    passScore: 70,
    maxAttempts: 3,
  },
]

async function main() {
  console.log('Seeding database...')

  // Branches
  for (const b of BRANCHES) {
    await db.branch.upsert({
      where: { id: b.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: { id: b.name.toLowerCase().replace(/\s+/g, '-'), ...b },
    })
  }
  console.log('✓ Branches seeded')

  // Stages
  for (const s of STAGES) {
    await db.stage.upsert({
      where: { number: s.number },
      update: s,
      create: s,
    })
  }
  console.log('✓ Stages seeded')

  // Super Admin
  const adminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@rysen.edu.in'
  const adminName = process.env.SUPER_ADMIN_NAME ?? 'RYSEN Admin'
  await db.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.SUPER_ADMIN },
    create: { name: adminName, email: adminEmail, role: Role.SUPER_ADMIN },
  })
  console.log(`✓ Super admin: ${adminEmail}`)

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
