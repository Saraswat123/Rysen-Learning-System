/** Contract for a future durable AI run. The current routes do not use this yet. */
export const RUN_STATES = [
  'CREATED', 'QUEUED', 'PLANNING', 'AWAITING_APPROVAL',
  'EXECUTING', 'VERIFYING', 'SUCCEEDED', 'FAILED', 'CANCELLED',
] as const

export type RunState = typeof RUN_STATES[number]

const NEXT: Record<RunState, readonly RunState[]> = {
  CREATED: ['QUEUED', 'CANCELLED'],
  QUEUED: ['PLANNING', 'FAILED', 'CANCELLED'],
  PLANNING: ['AWAITING_APPROVAL', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
  AWAITING_APPROVAL: ['EXECUTING', 'FAILED', 'CANCELLED'],
  EXECUTING: ['VERIFYING', 'AWAITING_APPROVAL', 'FAILED', 'CANCELLED'],
  VERIFYING: ['PLANNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
}

export function assertRunTransition(current: RunState, next: RunState): void {
  if (!NEXT[current].includes(next)) {
    throw new Error(`Invalid AI run transition: ${current} -> ${next}`)
  }
}

export type ToolRisk = 'read' | 'write' | 'external' | 'destructive'

// Explicit allowlist. An unknown tool is never treated as read-only.
const TOOL_RISK: Record<string, ToolRisk> = {
  list_tasks: 'read',
  list_task_groups: 'read',
  list_educators: 'read',
  get_task: 'read',
  list_educator_groups: 'read',
  list_branches: 'read',
  get_test_completion_stats: 'read',
  get_my_tasks: 'read',
  get_task_details: 'read',
  get_my_resources: 'read',
  get_my_student_tests: 'read',
  get_my_student_progress_summary: 'read',
  get_my_recognition: 'read',
  create_task: 'write',
  update_task: 'write',
  assign_educators: 'write',
  add_subtask: 'write',
  add_resource: 'write',
  create_task_group: 'write',
  assign_group_to_task: 'write',
  mark_subtask_complete: 'write',
  send_reminder: 'external',
  delete_task: 'destructive',
}

export function toolRisk(name: string): ToolRisk {
  const risk = TOOL_RISK[name]
  if (!risk) throw new Error(`Unregistered AI tool: ${name}`)
  return risk
}

export function requiresHumanApproval(name: string): boolean {
  return toolRisk(name) !== 'read'
}

/** The caller must load approval from the DB and verify approver authority. */
export function assertToolApproval(
  name: string,
  proposedDigest: string,
  approval: { decision: 'APPROVED' | 'REJECTED'; payloadDigest: string; expiresAt: Date } | null,
  now: Date,
): void {
  if (!requiresHumanApproval(name)) return
  if (!approval || approval.decision !== 'APPROVED' || approval.payloadDigest !== proposedDigest || approval.expiresAt <= now) {
    throw new Error('AI action requires a current approval for the exact payload')
  }
}
