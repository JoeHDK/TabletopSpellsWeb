export const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const
export type AbilityKey = typeof ABILITY_KEYS[number]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

export const CASTER_ABILITY: Record<string, AbilityKey> = {
  Bard: 'charisma',
  Cleric: 'wisdom',
  Druid: 'wisdom',
  Paladin: 'charisma',
  Ranger: 'wisdom',
  Sorcerer: 'charisma',
  Warlock: 'charisma',
  Wizard: 'intelligence',
  'Eldritch Knight': 'intelligence',
  'Arcane Trickster': 'intelligence',
  Artificer: 'intelligence',
}
