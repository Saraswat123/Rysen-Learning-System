// One-off: assign createdById on existing students (added before the column
// existed) to their branch's educator, so rosters don't vanish for existing
// educators after the ownership-scoping fix. Safe to re-run — only touches
// students where createdById is still null.
import { db } from '../lib/db'
import { Role } from '../app/generated/prisma/client'

async function main() {
  const educators = await db.user.findMany({
    where: { role: Role.EDUCATOR },
    select: { id: true, name: true, branchId: true },
  })
  const byBranch = new Map<string, { id: string; name: string }>()
  for (const e of educators) {
    if (e.branchId && !byBranch.has(e.branchId)) byBranch.set(e.branchId, { id: e.id, name: e.name })
  }

  const toBackfill = await db.student.findMany({
    where: { createdById: null },
    select: { id: true, branchId: true },
  })
  console.log(`Educators with a branch: ${byBranch.size} | Students needing backfill: ${toBackfill.length}`)

  let assigned = 0, skippedNoBranch = 0, skippedNoEducator = 0, failed = 0
  for (const s of toBackfill) {
    if (!s.branchId) { skippedNoBranch++; continue }
    const edu = byBranch.get(s.branchId)
    if (!edu) { skippedNoEducator++; continue }
    // Neon's pooler drops idle/long-lived connections mid-run on a loop this
    // long — retry once per row instead of letting one hiccup kill the whole
    // backfill. The script is safe to just rerun too (only touches createdById: null).
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await db.student.update({ where: { id: s.id }, data: { createdById: edu.id } })
        assigned++
        break
      } catch (err) {
        if (attempt === 2) {
          failed++
          console.error(`Failed on student ${s.id} after 3 attempts:`, (err as Error).message)
        } else {
          await new Promise((r) => setTimeout(r, 500))
        }
      }
    }
    if (assigned % 500 === 0 && assigned > 0) console.log(`...${assigned} assigned so far`)
  }

  console.log(`Assigned: ${assigned} | Skipped (no branch): ${skippedNoBranch} | Skipped (no educator for branch): ${skippedNoEducator} | Failed: ${failed}`)
  await db.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
