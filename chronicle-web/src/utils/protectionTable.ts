/**
 * Known SRD protection items that grant AC and/or saving throw bonuses.
 * Source: D&D 5e SRD 5.1 magic item descriptions.
 */

interface ProtectionEntry {
  acBonus?: number
  savingThrowBonus?: number
}

const PROTECTION_TABLE: Record<string, ProtectionEntry> = {
  // Shields
  'shield': { acBonus: 2 },
  '+1 shield': { acBonus: 3 },
  '+2 shield': { acBonus: 4 },
  '+3 shield': { acBonus: 5 },
  // Magic protection items
  'ring of protection':           { acBonus: 1, savingThrowBonus: 1 },
  'ring of protection +1':        { acBonus: 1, savingThrowBonus: 1 },
  'ring of protection +2':        { acBonus: 2, savingThrowBonus: 2 },
  'ring of protection +3':        { acBonus: 3, savingThrowBonus: 3 },
  'cloak of protection':          { acBonus: 1, savingThrowBonus: 1 },
  'cloak of protection +1':       { acBonus: 1, savingThrowBonus: 1 },
  'cloak of protection +2':       { acBonus: 2, savingThrowBonus: 2 },
  'cloak of protection +3':       { acBonus: 3, savingThrowBonus: 3 },
  'ioun stone of protection':     { acBonus: 1 },
  'bracers of defense':           { acBonus: 2 },
  'amulet of natural armor':      { acBonus: 1 },
  'amulet of natural armor +1':   { acBonus: 1 },
  'amulet of natural armor +2':   { acBonus: 2 },
  'amulet of natural armor +3':   { acBonus: 3 },
}

/**
 * Looks up a protection entry by item name (case-insensitive, exact then partial).
 * Returns the entry if found, otherwise undefined.
 */
export function lookupProtection(name: string): ProtectionEntry | undefined {
  const lower = name.toLowerCase()
  if (PROTECTION_TABLE[lower]) return PROTECTION_TABLE[lower]
  for (const [key, entry] of Object.entries(PROTECTION_TABLE)) {
    if (lower.includes(key)) return entry
  }
  return undefined
}
