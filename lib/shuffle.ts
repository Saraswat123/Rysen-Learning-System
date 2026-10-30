// Deterministic per-student shuffle — same student always gets the same order on
// reload/resume, but two students sitting side by side get different question order
// AND different option order per question, so screen-glancing doesn't help them cheat.

function seededRng(seed: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = seededRng(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
