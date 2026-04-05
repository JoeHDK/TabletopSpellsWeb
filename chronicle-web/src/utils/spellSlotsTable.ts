type SlotTable = Record<number, Record<number, number>>;

// D&D 5e Full Casters: Bard, Cleric, Druid, Sorcerer, Wizard
const dnd5eFullCasterTable: SlotTable = {
  1:  { 1:2 },
  2:  { 1:3 },
  3:  { 1:4, 2:2 },
  4:  { 1:4, 2:3 },
  5:  { 1:4, 2:3, 3:2 },
  6:  { 1:4, 2:3, 3:3 },
  7:  { 1:4, 2:3, 3:3, 4:1 },
  8:  { 1:4, 2:3, 3:3, 4:2 },
  9:  { 1:4, 2:3, 3:3, 4:3, 5:1 },
  10: { 1:4, 2:3, 3:3, 4:3, 5:2 },
  11: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1 },
  12: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1 },
  13: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1 },
  14: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1 },
  15: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1 },
  16: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1 },
  17: { 1:4, 2:3, 3:3, 4:3, 5:2, 6:1, 7:1, 8:1, 9:1 },
  18: { 1:4, 2:3, 3:3, 4:3, 5:3, 6:1, 7:1, 8:1, 9:1 },
  19: { 1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:1, 8:1, 9:1 },
  20: { 1:4, 2:3, 3:3, 4:3, 5:3, 6:2, 7:2, 8:1, 9:1 },
};

// D&D 5e Half Casters: Paladin, Ranger
const dnd5eHalfCasterTable: SlotTable = {
  1:  {},
  2:  { 1:2 },
  3:  { 1:3 },
  4:  { 1:3 },
  5:  { 1:4, 2:2 },
  6:  { 1:4, 2:2 },
  7:  { 1:4, 2:3 },
  8:  { 1:4, 2:3 },
  9:  { 1:4, 2:3, 3:2 },
  10: { 1:4, 2:3, 3:2 },
  11: { 1:4, 2:3, 3:3 },
  12: { 1:4, 2:3, 3:3 },
  13: { 1:4, 2:3, 3:3, 4:1 },
  14: { 1:4, 2:3, 3:3, 4:1 },
  15: { 1:4, 2:3, 3:3, 4:2 },
  16: { 1:4, 2:3, 3:3, 4:2 },
  17: { 1:4, 2:3, 3:3, 4:3, 5:1 },
  18: { 1:4, 2:3, 3:3, 4:3, 5:1 },
  19: { 1:4, 2:3, 3:3, 4:3, 5:2 },
  20: { 1:4, 2:3, 3:3, 4:3, 5:2 },
};

// D&D 5e Warlock (Pact Magic)
const dnd5eWarlockTable: SlotTable = {
  1:  { 1:1 },
  2:  { 1:2 },
  3:  { 2:2 },
  4:  { 2:2 },
  5:  { 3:2 },
  6:  { 3:2 },
  7:  { 4:2 },
  8:  { 4:2 },
  9:  { 5:2 },
  10: { 5:2 },
  11: { 5:3 },
  12: { 5:3 },
  13: { 5:3 },
  14: { 5:3 },
  15: { 5:3 },
  16: { 5:3 },
  17: { 5:4 },
  18: { 5:4 },
  19: { 5:4 },
  20: { 5:4 },
};

// D&D 5e Artificer (half caster, starts at level 1)
const dnd5eArtificerTable: SlotTable = {
  1:  { 1:2 },
  2:  { 1:2 },
  3:  { 1:3 },
  4:  { 1:3 },
  5:  { 1:4, 2:2 },
  6:  { 1:4, 2:2 },
  7:  { 1:4, 2:3 },
  8:  { 1:4, 2:3 },
  9:  { 1:4, 2:3, 3:2 },
  10: { 1:4, 2:3, 3:2 },
  11: { 1:4, 2:3, 3:3 },
  12: { 1:4, 2:3, 3:3 },
  13: { 1:4, 2:3, 3:3, 4:1 },
  14: { 1:4, 2:3, 3:3, 4:1 },
  15: { 1:4, 2:3, 3:3, 4:2 },
  16: { 1:4, 2:3, 3:3, 4:2 },
  17: { 1:4, 2:3, 3:3, 4:3, 5:1 },
  18: { 1:4, 2:3, 3:3, 4:3, 5:1 },
  19: { 1:4, 2:3, 3:3, 4:3, 5:2 },
  20: { 1:4, 2:3, 3:3, 4:3, 5:2 },
};

function resolveTable(normalizedClass: string): SlotTable | null {
  switch (normalizedClass) {
    case 'bard':
    case 'cleric':
    case 'druid':
    case 'sorcerer':
    case 'wizard':
      return dnd5eFullCasterTable;
    case 'paladin':
    case 'ranger':
      return dnd5eHalfCasterTable;
    case 'warlock':
      return dnd5eWarlockTable;
    case 'artificer':
      return dnd5eArtificerTable;
    default:
      return null;
  }
}

export function getExpectedSpellSlots(
  characterClass: string,
  level: number,
  _gameType?: string
): Record<number, number> {
  const normalizedClass = characterClass.toLowerCase().trim();
  const clampedLevel = Math.max(1, Math.min(20, level));
  const table = resolveTable(normalizedClass);
  if (table === null) return {};
  return table[clampedLevel] ?? {};
}

export function isCasterClass(
  characterClass: string,
  _gameType?: string
): boolean {
  const normalizedClass = characterClass.toLowerCase().trim();
  return resolveTable(normalizedClass) !== null;
}
