/**
 * Standard D&D 5e armor base AC values and type mappings.
 * Source: SRD 5.1 equipment tables.
 */

import type { ArmorType } from '../types'

interface ArmorEntry {
  ac: number
  type: ArmorType
}

export const ARMOR_TABLE: Record<string, ArmorEntry> = {
  // Light armor
  'padded': { ac: 11, type: 'Light' },
  'leather': { ac: 11, type: 'Light' },
  'studded leather': { ac: 12, type: 'Light' },
  // Medium armor
  'hide': { ac: 12, type: 'Medium' },
  'chain shirt': { ac: 13, type: 'Medium' },
  'scale mail': { ac: 14, type: 'Medium' },
  'breastplate': { ac: 14, type: 'Medium' },
  'half plate': { ac: 15, type: 'Medium' },
  // Heavy armor
  'ring mail': { ac: 14, type: 'Heavy' },
  'chain mail': { ac: 16, type: 'Heavy' },
  'splint': { ac: 17, type: 'Heavy' },
  'splint mail': { ac: 17, type: 'Heavy' },
  'plate': { ac: 18, type: 'Heavy' },
  'plate mail': { ac: 18, type: 'Heavy' },
  'full plate': { ac: 18, type: 'Heavy' },
}

/**
 * Looks up a standard armor entry by name (case-insensitive, partial match).
 * Returns the entry if found, otherwise undefined.
 */
export function lookupArmor(name: string): ArmorEntry | undefined {
  const lower = name.toLowerCase()
  // Exact match first
  if (ARMOR_TABLE[lower]) return ARMOR_TABLE[lower]
  // Partial match — find the first entry whose key appears in the name
  for (const [key, entry] of Object.entries(ARMOR_TABLE)) {
    if (lower.includes(key)) return entry
  }
  return undefined
}
