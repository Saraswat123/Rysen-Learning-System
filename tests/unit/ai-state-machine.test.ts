import { describe, expect, it } from 'vitest'
import { assertRunTransition, assertToolApproval, requiresHumanApproval, toolRisk } from '@/ai/state-machine'

describe('Rysen AI run contract', () => {
  it('permits a reviewable write and rejects a terminal-state replay', () => {
    expect(() => assertRunTransition('PLANNING', 'AWAITING_APPROVAL')).not.toThrow()
    expect(() => assertRunTransition('AWAITING_APPROVAL', 'EXECUTING')).not.toThrow()
    expect(() => assertRunTransition('SUCCEEDED', 'EXECUTING')).toThrow()
  })

  it('classifies existing mutating tools for human approval', () => {
    expect(requiresHumanApproval('list_tasks')).toBe(false)
    expect(requiresHumanApproval('create_task')).toBe(true)
    expect(toolRisk('send_reminder')).toBe('external')
    expect(toolRisk('delete_task')).toBe('destructive')
    expect(() => toolRisk('unregistered_tool')).toThrow()
  })

  it('binds approval to the exact action and expiry', () => {
    const now = new Date('2026-11-17T10:00:00Z')
    const approval = { decision: 'APPROVED' as const, payloadDigest: 'digest-1', expiresAt: new Date('2026-11-17T10:05:00Z') }
    expect(() => assertToolApproval('create_task', 'digest-1', approval, now)).not.toThrow()
    expect(() => assertToolApproval('create_task', 'digest-2', approval, now)).toThrow()
    expect(() => assertToolApproval('create_task', 'digest-1', approval, approval.expiresAt)).toThrow()
    expect(() => assertToolApproval('create_task', 'digest-1', null, now)).toThrow()
  })
})
