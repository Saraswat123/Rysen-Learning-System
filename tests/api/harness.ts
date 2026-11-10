import { vi } from 'vitest'
import { NextRequest } from 'next/server'
import { Role } from '@/app/generated/prisma/client'

type Fn = ReturnType<typeof vi.fn>
type Model = Record<'findUnique' | 'findFirst' | 'findMany' | 'create' | 'createMany' | 'update' | 'updateMany' | 'upsert' | 'delete' | 'deleteMany' | 'count' | 'aggregate', Fn>

function model(): Model {
  return {
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async ({ data }: { data: object }) => ({ id: 'new_id', ...data })),
    createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    update: vi.fn(async ({ data }: { data: object }) => ({ id: 'updated_id', ...data })),
    updateMany: vi.fn(async () => ({ count: 0 })),
    upsert: vi.fn(async ({ create }: { create: object }) => ({ id: 'upserted_id', attempts: 1, ...create })),
    delete: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    count: vi.fn(async () => 0),
    aggregate: vi.fn(async () => ({ _max: { order: 0 } })),
  }
}

const models = new Map<string, Model>()
const raw = {
  $queryRaw: vi.fn(async () => []),
  $queryRawUnsafe: vi.fn(async () => [{ count: 1 }]),
  $executeRaw: vi.fn(async () => 0),
  $executeRawUnsafe: vi.fn(async () => 0),
}

/** Prisma-shaped stand-in: every model gets vi.fn methods; $transaction runs the callback against it. */
export const db: Record<string, Model> & typeof raw & { $transaction: Fn } = new Proxy({} as never, {
  get(_t, prop: string) {
    if (prop in raw) return raw[prop as keyof typeof raw]
    if (prop === '$transaction') return transaction
    if (prop === 'then') return undefined
    if (!models.has(prop)) models.set(prop, model())
    return models.get(prop)
  },
})

const transaction = vi.fn(async (arg: unknown) => (typeof arg === 'function' ? arg(db) : Promise.all(arg as Promise<unknown>[])))

export function resetDb() {
  models.clear()
  for (const fn of Object.values(raw)) fn.mockReset()
  raw.$queryRaw.mockResolvedValue([])
  raw.$queryRawUnsafe.mockResolvedValue([{ count: 1 }])
  raw.$executeRaw.mockResolvedValue(0)
  raw.$executeRawUnsafe.mockResolvedValue(0)
  transaction.mockClear()
}

/** Make the Postgres rate limiter report this many hits for the next calls. */
export function rateLimitHits(count: number) {
  raw.$queryRawUnsafe.mockResolvedValue([{ count }])
}

export function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

export const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

export function staff(role: Role, overrides: Partial<{ id: string; branchId: string | null; name: string }> = {}) {
  return { id: `${role.toLowerCase()}_1`, name: 'Test User', email: 'test@example.com', role, branchId: 'branch_A', isActive: true, branch: null, ...overrides }
}
