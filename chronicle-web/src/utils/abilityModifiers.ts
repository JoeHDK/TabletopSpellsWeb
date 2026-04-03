/** Returns the D&D 5e ability modifier for a given score (floor((score - 10) / 2)). */
export function getAbilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Returns the modifier as a signed string, e.g. "+3" or "-1". */
export function getAbilityModStr(score: number): string {
  const m = getAbilityMod(score)
  return m >= 0 ? `+${m}` : String(m)
}

/** Returns the modifier for a named key from a Record<string, number>. */
export function getAbilityModByKey(scores: Record<string, number>, key: string): number {
  return getAbilityMod(scores[key] ?? 10)
}
