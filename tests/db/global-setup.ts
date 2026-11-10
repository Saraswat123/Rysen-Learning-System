import { execFileSync } from 'node:child_process'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    schemaSql: string
  }
}

// The full DDL Prisma would create for prisma/schema.prisma, generated once per run
export default function setup(project: TestProject) {
  const sql = execFileSync('npx', ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  project.provide('schemaSql', sql)
}
