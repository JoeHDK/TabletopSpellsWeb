// Mirrors the backend Class enum order exactly, for handling legacy numeric values in cache
export const CLASS_NAMES_BY_INDEX = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue',
  'sorcerer', 'wizard', 'inquisitor', 'summoner', 'witch', 'alchemist', 'magus', 'oracle',
  'shaman', 'spiritualist', 'occultist', 'psychic', 'mesmerist', 'warlock', 'artificer',
]

/** Resolves characterClass to a lowercase string regardless of whether it's a string or legacy numeric enum value. */
export function resolveClassName(characterClass: unknown): string {
  if (typeof characterClass === 'string') return characterClass.toLowerCase()
  if (typeof characterClass === 'number') return CLASS_NAMES_BY_INDEX[characterClass] ?? ''
  return ''
}

/** Returns true for classes that prepare spells daily from a spellbook (Wizard, Artificer). */
export function isPreparingCaster(characterClass: unknown): boolean {
  const cls = resolveClassName(characterClass)
  return cls === 'wizard' || cls === 'artificer'
}

/** Returns the spell level for a specific class, or null if the spell doesn't belong to that class.
 *  Handles formats like "sorcerer 1, wizard 1" and "sorcerer/wizard 3, witch 3". */
export function getLevelForClass(spellLevel: string | undefined, characterClass: unknown): number | null {
  if (!spellLevel) return null
  const lc = spellLevel.toLowerCase()
  const cls = resolveClassName(characterClass)
  if (!cls) return null
  for (const entry of lc.split(',')) {
    const trimmed = entry.trim()
    if (trimmed.split(/\s+/)[0].split('/').some((part) => part === cls)) {
      const match = trimmed.match(/(\d+)\s*$/)
      if (match) return parseInt(match[1])
      if (trimmed.includes('cantrip')) return 0
    }
  }
  return null
}

/** Parses the first numeric level found in the string, used for sorting "All" results. */
export function parseFirstLevel(spellLevel?: string): number {
  if (!spellLevel) return 0
  if (spellLevel.toLowerCase().includes('cantrip') && !/\d/.test(spellLevel)) return 0
  const match = spellLevel.match(/(\d+)/)
  return match ? parseInt(match[1]) : 0
}
