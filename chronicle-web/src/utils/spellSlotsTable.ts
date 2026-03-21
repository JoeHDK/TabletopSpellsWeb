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

// Pathfinder 1e Full Casters: Cleric, Druid, Oracle, Witch, Shaman, Spiritualist
const pf1eFullCasterTable: SlotTable = {
  1:  { 1:1 },
  2:  { 1:2 },
  3:  { 1:2, 2:1 },
  4:  { 1:3, 2:2 },
  5:  { 1:3, 2:2, 3:1 },
  6:  { 1:3, 2:3, 3:2 },
  7:  { 1:4, 2:3, 3:2, 4:1 },
  8:  { 1:4, 2:3, 3:3, 4:2 },
  9:  { 1:4, 2:4, 3:3, 4:2, 5:1 },
  10: { 1:4, 2:4, 3:3, 4:3, 5:2 },
  11: { 1:4, 2:4, 3:4, 4:3, 5:2, 6:1 },
  12: { 1:4, 2:4, 3:4, 4:3, 5:3, 6:2 },
  13: { 1:4, 2:4, 3:4, 4:4, 5:3, 6:2, 7:1 },
  14: { 1:4, 2:4, 3:4, 4:4, 5:3, 6:3, 7:2 },
  15: { 1:4, 2:4, 3:4, 4:4, 5:4, 6:3, 7:2, 8:1 },
  16: { 1:4, 2:4, 3:4, 4:4, 5:4, 6:3, 7:3, 8:2 },
  17: { 1:4, 2:4, 3:4, 4:4, 5:4, 6:4, 7:3, 8:2, 9:1 },
  18: { 1:4, 2:4, 3:4, 4:4, 5:4, 6:4, 7:3, 8:3, 9:2 },
  19: { 1:4, 2:4, 3:4, 4:4, 5:4, 6:4, 7:4, 8:3, 9:3 },
  20: { 1:4, 2:4, 3:4, 4:4, 5:4, 6:4, 7:4, 8:4, 9:4 },
};

// Pathfinder 1e Spontaneous Full Casters: Sorcerer, Summoner, Psychic, Occultist, Mesmerist
const pf1eSpontaneousFullCasterTable: SlotTable = {
  1:  { 1:3 },
  2:  { 1:4 },
  3:  { 1:5, 2:3 },
  4:  { 1:6, 2:4 },
  5:  { 1:6, 2:5, 3:3 },
  6:  { 1:6, 2:6, 3:4 },
  7:  { 1:6, 2:6, 3:5, 4:3 },
  8:  { 1:6, 2:6, 3:6, 4:4 },
  9:  { 1:6, 2:6, 3:6, 4:5, 5:3 },
  10: { 1:6, 2:6, 3:6, 4:6, 5:4 },
  11: { 1:6, 2:6, 3:6, 4:6, 5:5, 6:3 },
  12: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:4 },
  13: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:5, 7:3 },
  14: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:6, 7:4 },
  15: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:6, 7:5, 8:3 },
  16: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:6, 7:6, 8:4 },
  17: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:6, 7:6, 8:5, 9:3 },
  18: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:6, 7:6, 8:6, 9:4 },
  19: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:6, 7:6, 8:6, 9:6 },
  20: { 1:6, 2:6, 3:6, 4:6, 5:6, 6:6, 7:6, 8:6, 9:9 },
};

// Pathfinder 1e 6th-level Casters: Bard, Inquisitor, Magus, Alchemist
const pf1eSixthLevelCasterTable: SlotTable = {
  1:  { 1:1 },
  2:  { 1:2 },
  3:  { 1:3 },
  4:  { 1:3, 2:1 },
  5:  { 1:4, 2:2 },
  6:  { 1:4, 2:3 },
  7:  { 1:4, 2:3, 3:1 },
  8:  { 1:4, 2:4, 3:2 },
  9:  { 1:5, 2:4, 3:3 },
  10: { 1:5, 2:4, 3:3, 4:1 },
  11: { 1:5, 2:4, 3:4, 4:2 },
  12: { 1:5, 2:5, 3:4, 4:3 },
  13: { 1:5, 2:5, 3:4, 4:3, 5:1 },
  14: { 1:5, 2:5, 3:4, 4:4, 5:2 },
  15: { 1:5, 2:5, 3:5, 4:4, 5:3 },
  16: { 1:5, 2:5, 3:5, 4:4, 5:3, 6:1 },
  17: { 1:5, 2:5, 3:5, 4:4, 5:4, 6:2 },
  18: { 1:5, 2:5, 3:5, 4:5, 5:4, 6:3 },
  19: { 1:5, 2:5, 3:5, 4:5, 5:5, 6:4 },
  20: { 1:5, 2:5, 3:5, 4:5, 5:5, 6:5 },
};

// Pathfinder 1e 4th-level Half Casters: Paladin, Ranger
const pf1eHalfCasterTable: SlotTable = {
  1:  {},
  2:  {},
  3:  {},
  4:  { 1:1 },
  5:  { 1:1 },
  6:  { 1:1 },
  7:  { 1:1, 2:1 },
  8:  { 1:1, 2:1 },
  9:  { 1:2, 2:1 },
  10: { 1:2, 2:1, 3:1 },
  11: { 1:2, 2:1, 3:1 },
  12: { 1:2, 2:2, 3:1 },
  13: { 1:3, 2:2, 3:1, 4:1 },
  14: { 1:3, 2:2, 3:1, 4:1 },
  15: { 1:3, 2:2, 3:2, 4:1 },
  16: { 1:3, 2:3, 3:2, 4:1 },
  17: { 1:4, 2:3, 3:2, 4:1 },
  18: { 1:4, 2:3, 3:2, 4:2 },
  19: { 1:4, 2:3, 3:3, 4:2 },
  20: { 1:4, 2:4, 3:3, 4:2 },
};

function resolveTable(
  normalizedClass: string,
  gameType: 'dnd5e' | 'pathfinder1e'
): SlotTable | null {
  if (gameType === 'dnd5e') {
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
  } else {
    switch (normalizedClass) {
      case 'cleric':
      case 'druid':
      case 'oracle':
      case 'witch':
      case 'shaman':
      case 'spiritualist':
        return pf1eFullCasterTable;
      case 'sorcerer':
      case 'summoner':
      case 'psychic':
      case 'occultist':
      case 'mesmerist':
        return pf1eSpontaneousFullCasterTable;
      case 'bard':
      case 'inquisitor':
      case 'magus':
      case 'alchemist':
        return pf1eSixthLevelCasterTable;
      case 'paladin':
      case 'ranger':
        return pf1eHalfCasterTable;
      default:
        return null;
    }
  }
}

export function getExpectedSpellSlots(
  characterClass: string,
  level: number,
  gameType: 'dnd5e' | 'pathfinder1e'
): Record<number, number> {
  const normalizedClass = characterClass.toLowerCase().trim();
  const clampedLevel = Math.max(1, Math.min(20, level));
  const table = resolveTable(normalizedClass, gameType);
  if (table === null) return {};
  return table[clampedLevel] ?? {};
}

export function isCasterClass(
  characterClass: string,
  gameType: 'dnd5e' | 'pathfinder1e'
): boolean {
  const normalizedClass = characterClass.toLowerCase().trim();
  return resolveTable(normalizedClass, gameType) !== null;
}
