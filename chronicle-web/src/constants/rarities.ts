export const RARITIES = [
  'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact',
] as const

export type Rarity = typeof RARITIES[number]
