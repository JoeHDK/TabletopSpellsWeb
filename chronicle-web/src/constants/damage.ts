export const DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning',
  'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic',
] as const

export type DamageTypeName = typeof DAMAGE_TYPES[number]
