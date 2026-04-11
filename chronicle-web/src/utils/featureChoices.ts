import type {
  CharacterClass,
  CharacterFeatureChoice,
  CharacterFeatureChoiceKind,
  ClassResource,
} from '../types'

export interface FeatureChoiceOption {
  id: string
  name: string
  description?: string
  requiresChoices?: ChoiceRequirement[]
  requiresKnownSpells?: string[]
  minLevel?: number
}

export interface ChoiceRequirement {
  choiceId: string
  optionIds: string[]
}

export interface FeatureChoiceDefinition {
  id: string
  featureId: string
  className: CharacterClass
  subclass?: string | null
  level: number
  prompt: string
  count: number
  kind: CharacterFeatureChoiceKind
  options: FeatureChoiceOption[]
  addToResourceKey?: string
  requiresChoices?: ChoiceRequirement[]
  excludeSelectedOptionsFromFeatureId?: string
}

interface FeatureChoiceContext {
  targetClass: CharacterClass
  subclass?: string | null
  level: number
  previousLevel?: number
  existingFeatureChoices?: CharacterFeatureChoice[]
  classResources?: ClassResource[]
  skillExpertise?: string[]
  pendingSelections?: Record<string, string[]>
  knownSpellNames?: string[]
}

export interface AppliedFeatureChoiceEffects {
  skillProficiencies: string[]
  skillExpertise: string[]
  spellNames: string[]
  resourceOptions: Record<string, string[]>
  persistedFeatureChoices: CharacterFeatureChoice[]
}

const FIGHTING_STYLE_OPTIONS: Record<string, FeatureChoiceOption[]> = {
  fighter: [
    { id: 'Archery', name: 'Archery', description: '+2 to ranged weapon attack rolls.' },
    { id: 'Defense', name: 'Defense', description: '+1 AC while wearing armor.' },
    { id: 'Dueling', name: 'Dueling', description: '+2 damage with a one-handed melee weapon when no other weapon is held.' },
    { id: 'Great Weapon Fighting', name: 'Great Weapon Fighting', description: 'Reroll 1s and 2s on two-handed weapon damage dice.' },
    { id: 'Protection', name: 'Protection', description: 'Use your reaction to impose disadvantage on an attack against an ally.' },
    { id: 'Two-Weapon Fighting', name: 'Two-Weapon Fighting', description: 'Add your ability modifier to off-hand attack damage.' },
  ],
  paladin: [
    { id: 'Defense', name: 'Defense', description: '+1 AC while wearing armor.' },
    { id: 'Dueling', name: 'Dueling', description: '+2 damage with a one-handed melee weapon when no other weapon is held.' },
    { id: 'Great Weapon Fighting', name: 'Great Weapon Fighting', description: 'Reroll 1s and 2s on two-handed weapon damage dice.' },
    { id: 'Protection', name: 'Protection', description: 'Use your reaction to impose disadvantage on an attack against an ally.' },
  ],
  ranger: [
    { id: 'Archery', name: 'Archery', description: '+2 to ranged weapon attack rolls.' },
    { id: 'Defense', name: 'Defense', description: '+1 AC while wearing armor.' },
    { id: 'Dueling', name: 'Dueling', description: '+2 damage with a one-handed melee weapon when no other weapon is held.' },
    { id: 'Two-Weapon Fighting', name: 'Two-Weapon Fighting', description: 'Add your ability modifier to off-hand attack damage.' },
  ],
  swords: [
    { id: 'Dueling', name: 'Dueling', description: '+2 damage with a one-handed melee weapon when no other weapon is held.' },
    { id: 'Two-Weapon Fighting', name: 'Two-Weapon Fighting', description: 'Add your ability modifier to off-hand attack damage.' },
  ],
}

const BATTLE_MASTER_MANEUVERS: FeatureChoiceOption[] = [
  { id: 'Ambush', name: 'Ambush', description: 'Add a superiority die to Stealth or initiative rolls.' },
  { id: 'Brace', name: 'Brace', description: 'Attack with your reaction when a creature enters your reach.' },
  { id: "Commander's Strike", name: "Commander's Strike", description: 'Give up one attack to direct an ally to strike.' },
  { id: 'Disarming Attack', name: 'Disarming Attack', description: 'Add damage and force a target to drop an item.' },
  { id: 'Distracting Strike', name: 'Distracting Strike', description: 'Add damage and grant the next attacker advantage.' },
  { id: 'Evasive Footwork', name: 'Evasive Footwork', description: 'Add a superiority die to AC while moving.' },
  { id: 'Feinting Attack', name: 'Feinting Attack', description: 'Spend a bonus action to gain advantage and add damage.' },
  { id: 'Goading Attack', name: 'Goading Attack', description: 'Add damage and pressure the target to attack you.' },
  { id: 'Lunging Attack', name: 'Lunging Attack', description: 'Increase your melee reach by 5 feet for one attack.' },
  { id: 'Maneuvering Attack', name: 'Maneuvering Attack', description: 'Add damage and let an ally move without opportunity attacks.' },
  { id: 'Menacing Attack', name: 'Menacing Attack', description: 'Add damage and frighten the target on a failed save.' },
  { id: 'Parry', name: 'Parry', description: 'Use your reaction to reduce melee damage taken.' },
  { id: 'Precision Attack', name: 'Precision Attack', description: 'Add a superiority die to an attack roll after seeing it.' },
  { id: 'Pushing Attack', name: 'Pushing Attack', description: 'Add damage and push a target away on a failed save.' },
  { id: 'Rally', name: 'Rally', description: 'Use a bonus action to grant temporary hit points to an ally.' },
  { id: 'Riposte', name: 'Riposte', description: 'Use your reaction to strike back after a miss.' },
  { id: 'Sweeping Attack', name: 'Sweeping Attack', description: 'Carry some damage over to a second nearby creature.' },
  { id: 'Trip Attack', name: 'Trip Attack', description: 'Add damage and knock the target prone on a failed save.' },
]

const METAMAGIC_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Careful Spell', name: 'Careful Spell', description: 'Protect chosen creatures from your spell’s full effects.' },
  { id: 'Distant Spell', name: 'Distant Spell', description: 'Double range or turn touch into 30 feet.' },
  { id: 'Empowered Spell', name: 'Empowered Spell', description: 'Reroll a number of damage dice up to your Charisma modifier.' },
  { id: 'Extended Spell', name: 'Extended Spell', description: 'Double a spell’s duration up to 24 hours.' },
  { id: 'Heightened Spell', name: 'Heightened Spell', description: 'Give one target disadvantage on its first save against the spell.' },
  { id: 'Quickened Spell', name: 'Quickened Spell', description: 'Cast a 1-action spell as a bonus action.' },
  { id: 'Subtle Spell', name: 'Subtle Spell', description: 'Cast without somatic or verbal components.' },
  { id: 'Twinned Spell', name: 'Twinned Spell', description: 'Target a second creature with a single-target spell.' },
]

const FAVORED_ENEMY_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Aberrations', name: 'Aberrations' },
  { id: 'Beasts', name: 'Beasts' },
  { id: 'Celestials', name: 'Celestials' },
  { id: 'Constructs', name: 'Constructs' },
  { id: 'Dragons', name: 'Dragons' },
  { id: 'Elementals', name: 'Elementals' },
  { id: 'Fey', name: 'Fey' },
  { id: 'Fiends', name: 'Fiends' },
  { id: 'Giants', name: 'Giants' },
  { id: 'Monstrosities', name: 'Monstrosities' },
  { id: 'Oozes', name: 'Oozes' },
  { id: 'Plants', name: 'Plants' },
  { id: 'Undead', name: 'Undead' },
]

const NATURAL_EXPLORER_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Arctic', name: 'Arctic' },
  { id: 'Coast', name: 'Coast' },
  { id: 'Desert', name: 'Desert' },
  { id: 'Forest', name: 'Forest' },
  { id: 'Grassland', name: 'Grassland' },
  { id: 'Mountain', name: 'Mountain' },
  { id: 'Swamp', name: 'Swamp' },
  { id: 'Underdark', name: 'Underdark' },
]

const INFUSION_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Armor of Magical Strength', name: 'Armor of Magical Strength', description: 'Use charges to boost Strength checks or avoid being knocked prone.' },
  { id: 'Boots of the Winding Path', name: 'Boots of the Winding Path', description: 'Teleport back to a space you occupied earlier that turn.', minLevel: 6 },
  { id: 'Enhanced Arcane Focus', name: 'Enhanced Arcane Focus', description: 'Add +1 to spell attacks and ignore half cover on spell attacks.' },
  { id: 'Enhanced Defense', name: 'Enhanced Defense', description: 'Grant +1 AC to armor or shield.' },
  { id: 'Enhanced Weapon', name: 'Enhanced Weapon', description: 'Grant +1 attack and damage to a simple or martial weapon.' },
  { id: 'Helm of Awareness', name: 'Helm of Awareness', description: 'Gain advantage on initiative rolls.' },
  { id: 'Homunculus Servant', name: 'Homunculus Servant', description: 'Create a magical servant companion.' },
  { id: 'Mind Sharpener', name: 'Mind Sharpener', description: 'Spend charges to maintain concentration after failing a save.' },
  { id: 'Radiant Weapon', name: 'Radiant Weapon', description: 'Weapon shines, gains +1, and can blind attackers as a reaction.' },
  { id: 'Repeating Shot', name: 'Repeating Shot', description: 'Ignore loading and create magical ammunition for a ranged weapon.' },
  { id: 'Replicate Magic Item: Bag of Holding', name: 'Replicate Magic Item: Bag of Holding' },
  { id: 'Replicate Magic Item: Goggles of Night', name: 'Replicate Magic Item: Goggles of Night' },
  { id: 'Replicate Magic Item: Sending Stones', name: 'Replicate Magic Item: Sending Stones' },
  { id: 'Replicate Magic Item: Wand of Magic Detection', name: 'Replicate Magic Item: Wand of Magic Detection' },
  { id: 'Replicate Magic Item: Wand of Secrets', name: 'Replicate Magic Item: Wand of Secrets' },
  { id: 'Repulsion Shield', name: 'Repulsion Shield', description: 'Gain +1 AC and push attackers away as a reaction.', minLevel: 6 },
  { id: 'Resistant Armor', name: 'Resistant Armor', description: 'Armor grants resistance to one chosen damage type.', minLevel: 6 },
  { id: 'Returning Weapon', name: 'Returning Weapon', description: 'Thrown weapon returns immediately after it is used.' },
  { id: 'Spell-Refueling Ring', name: 'Spell-Refueling Ring', description: 'Recover an expended spell slot of 3rd level or lower.', minLevel: 6 },
  { id: 'Replicate Magic Item: Boots of Elvenkind', name: 'Replicate Magic Item: Boots of Elvenkind', minLevel: 10 },
  { id: 'Replicate Magic Item: Boots of Striding and Springing', name: 'Replicate Magic Item: Boots of Striding and Springing', minLevel: 10 },
  { id: 'Replicate Magic Item: Bracers of Archery', name: 'Replicate Magic Item: Bracers of Archery', minLevel: 10 },
  { id: 'Replicate Magic Item: Cloak of Elvenkind', name: 'Replicate Magic Item: Cloak of Elvenkind', minLevel: 10 },
  { id: 'Replicate Magic Item: Gloves of Thievery', name: 'Replicate Magic Item: Gloves of Thievery', minLevel: 10 },
  { id: 'Replicate Magic Item: Lantern of Revealing', name: 'Replicate Magic Item: Lantern of Revealing', minLevel: 10 },
  { id: 'Replicate Magic Item: Pipes of Haunting', name: 'Replicate Magic Item: Pipes of Haunting', minLevel: 10 },
  { id: 'Replicate Magic Item: Ring of Jumping', name: 'Replicate Magic Item: Ring of Jumping', minLevel: 10 },
  { id: 'Replicate Magic Item: Ring of Mind Shielding', name: 'Replicate Magic Item: Ring of Mind Shielding', minLevel: 10 },
  { id: 'Replicate Magic Item: Winged Boots', name: 'Replicate Magic Item: Winged Boots', minLevel: 10 },
  { id: 'Arcane Propulsion Armor', name: 'Arcane Propulsion Armor', description: 'Armor boosts movement and produces force gauntlet attacks.', minLevel: 14 },
  { id: 'Replicate Magic Item: Amulet of Health', name: 'Replicate Magic Item: Amulet of Health', minLevel: 14 },
  { id: 'Replicate Magic Item: Belt of Hill Giant Strength', name: 'Replicate Magic Item: Belt of Hill Giant Strength', minLevel: 14 },
  { id: 'Replicate Magic Item: Boots of Levitation', name: 'Replicate Magic Item: Boots of Levitation', minLevel: 14 },
  { id: 'Replicate Magic Item: Cloak of Protection', name: 'Replicate Magic Item: Cloak of Protection', minLevel: 14 },
  { id: 'Replicate Magic Item: Gauntlets of Ogre Power', name: 'Replicate Magic Item: Gauntlets of Ogre Power', minLevel: 14 },
  { id: 'Replicate Magic Item: Ring of Protection', name: 'Replicate Magic Item: Ring of Protection', minLevel: 14 },
]

const HUNTERS_PREY_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Colossus Slayer', name: 'Colossus Slayer', description: 'Deal an extra 1d8 damage once per turn to an injured target.' },
  { id: 'Giant Killer', name: 'Giant Killer', description: 'Use your reaction to attack a Large or larger creature that misses you.' },
  { id: 'Horde Breaker', name: 'Horde Breaker', description: 'Make one extra attack against a second nearby creature.' },
]

const DEFENSIVE_TACTICS_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Escape the Horde', name: 'Escape the Horde', description: 'Opportunity attacks against you have disadvantage.' },
  { id: 'Multiattack Defense', name: 'Multiattack Defense', description: 'Gain +4 AC against later attacks from the same creature this turn.' },
  { id: 'Steel Will', name: 'Steel Will', description: 'Gain advantage on saving throws against being frightened.' },
]

const HUNTER_MULTIATTACK_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Volley', name: 'Volley', description: 'Make a ranged attack against each creature in a 10-foot-radius area.' },
  { id: 'Whirlwind Attack', name: 'Whirlwind Attack', description: 'Make a melee attack against any number of creatures within 5 feet.' },
]

const SUPERIOR_HUNTERS_DEFENSE_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Evasion', name: 'Evasion', description: 'Take no damage on a successful Dexterity save against half-damage effects.' },
  { id: 'Stand Against the Tide', name: 'Stand Against the Tide', description: 'Redirect a missed melee attack to another creature.' },
  { id: 'Uncanny Dodge', name: 'Uncanny Dodge', description: 'Use your reaction to halve the damage of an attack that hits you.' },
]

const TOTEM_WARRIOR_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Bear', name: 'Bear' },
  { id: 'Eagle', name: 'Eagle' },
  { id: 'Wolf', name: 'Wolf' },
]

const KENSEI_MELEE_WEAPON_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Battleaxe', name: 'Battleaxe' },
  { id: 'Club', name: 'Club' },
  { id: 'Dagger', name: 'Dagger' },
  { id: 'Flail', name: 'Flail' },
  { id: 'Handaxe', name: 'Handaxe' },
  { id: 'Javelin', name: 'Javelin' },
  { id: 'Light Hammer', name: 'Light Hammer' },
  { id: 'Longsword', name: 'Longsword' },
  { id: 'Mace', name: 'Mace' },
  { id: 'Morningstar', name: 'Morningstar' },
  { id: 'Quarterstaff', name: 'Quarterstaff' },
  { id: 'Rapier', name: 'Rapier' },
  { id: 'Scimitar', name: 'Scimitar' },
  { id: 'Sickle', name: 'Sickle' },
  { id: 'Spear', name: 'Spear' },
  { id: 'Trident', name: 'Trident' },
  { id: 'War Pick', name: 'War Pick' },
  { id: 'Warhammer', name: 'Warhammer' },
  { id: 'Whip', name: 'Whip' },
]

const KENSEI_RANGED_WEAPON_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Blowgun', name: 'Blowgun' },
  { id: 'Dart', name: 'Dart' },
  { id: 'Hand Crossbow', name: 'Hand Crossbow' },
  { id: 'Light Crossbow', name: 'Light Crossbow' },
  { id: 'Shortbow', name: 'Shortbow' },
  { id: 'Sling', name: 'Sling' },
]

const FOUR_ELEMENTS_DISCIPLINE_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Fangs of the Fire Snake', name: 'Fangs of the Fire Snake' },
  { id: 'Fist of Four Thunders', name: 'Fist of Four Thunders' },
  { id: 'Fist of Unbroken Air', name: 'Fist of Unbroken Air' },
  { id: 'Rush of the Gale Spirits', name: 'Rush of the Gale Spirits' },
  { id: 'Shape the Flowing River', name: 'Shape the Flowing River' },
  { id: 'Sweeping Cinder Strike', name: 'Sweeping Cinder Strike' },
  { id: 'Water Whip', name: 'Water Whip' },
  { id: 'Clench of the North Wind', name: 'Clench of the North Wind', minLevel: 6 },
  { id: 'Gong of the Summit', name: 'Gong of the Summit', minLevel: 6 },
  { id: 'Flames of the Phoenix', name: 'Flames of the Phoenix', minLevel: 11 },
  { id: 'Mist Stance', name: 'Mist Stance', minLevel: 11 },
  { id: 'Ride the Wind', name: 'Ride the Wind', minLevel: 11 },
  { id: 'Breath of Winter', name: 'Breath of Winter', minLevel: 17 },
  { id: 'Eternal Mountain Defense', name: 'Eternal Mountain Defense', minLevel: 17 },
  { id: 'River of Hungry Flame', name: 'River of Hungry Flame', minLevel: 17 },
]

const PACT_BOON_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Pact of the Chain', name: 'Pact of the Chain', description: 'Gain a familiar with expanded special forms.' },
  { id: 'Pact of the Blade', name: 'Pact of the Blade', description: 'Conjure or bind a pact weapon for battle.' },
  { id: 'Pact of the Tome', name: 'Pact of the Tome', description: 'Receive a Book of Shadows and learn three extra cantrips.' },
]

const ELDRITCH_INVOCATION_OPTIONS: FeatureChoiceOption[] = [
  { id: 'Agonizing Blast', name: 'Agonizing Blast', description: 'Add Charisma modifier to Eldritch Blast damage.', requiresKnownSpells: ['Eldritch Blast'] },
  { id: 'Armor of Shadows', name: 'Armor of Shadows', description: 'Cast Mage Armor on yourself at will.' },
  { id: 'Ascendant Step', name: 'Ascendant Step', description: 'Cast Levitate on yourself at will.', minLevel: 9 },
  { id: 'Beast Speech', name: 'Beast Speech', description: 'Cast Speak with Animals at will.' },
  { id: 'Beguiling Influence', name: 'Beguiling Influence', description: 'Gain proficiency in Deception and Persuasion.' },
  { id: 'Bewitching Whispers', name: 'Bewitching Whispers', description: 'Cast Compulsion once using a warlock spell slot.', minLevel: 7 },
  { id: 'Book of Ancient Secrets', name: 'Book of Ancient Secrets', description: 'Record ritual spells in your Book of Shadows.', requiresChoices: [{ choiceId: 'warlock-pact-boon-choice', optionIds: ['Pact of the Tome'] }] },
  { id: "Devil's Sight", name: "Devil's Sight", description: 'See normally in darkness, magical or nonmagical, to 120 feet.' },
  { id: 'Dreadful Word', name: 'Dreadful Word', description: 'Cast Confusion once using a warlock spell slot.', minLevel: 7 },
  { id: 'Eldritch Sight', name: 'Eldritch Sight', description: 'Cast Detect Magic at will.' },
  { id: 'Eldritch Spear', name: 'Eldritch Spear', description: 'Increase Eldritch Blast range to 300 feet.', requiresKnownSpells: ['Eldritch Blast'] },
  { id: 'Eyes of the Rune Keeper', name: 'Eyes of the Rune Keeper', description: 'Read all writing.' },
  { id: 'Fiendish Vigor', name: 'Fiendish Vigor', description: 'Cast False Life on yourself at will as 1st level.' },
  { id: 'Gaze of Two Minds', name: 'Gaze of Two Minds', description: 'Perceive through a willing humanoid’s senses.' },
  { id: 'Lifedrinker', name: 'Lifedrinker', description: 'Your pact weapon deals extra necrotic damage equal to Charisma modifier.', requiresChoices: [{ choiceId: 'warlock-pact-boon-choice', optionIds: ['Pact of the Blade'] }], minLevel: 12 },
  { id: 'Mask of Many Faces', name: 'Mask of Many Faces', description: 'Cast Disguise Self at will.' },
  { id: 'Master of Myriad Forms', name: 'Master of Myriad Forms', description: 'Cast Alter Self at will.', minLevel: 15 },
  { id: 'Minions of Chaos', name: 'Minions of Chaos', description: 'Cast Conjure Elemental once using a warlock spell slot.', minLevel: 9 },
  { id: 'Mire the Mind', name: 'Mire the Mind', description: 'Cast Slow once using a warlock spell slot.', minLevel: 5 },
  { id: 'Misty Visions', name: 'Misty Visions', description: 'Cast Silent Image at will.' },
  { id: 'One with Shadows', name: 'One with Shadows', description: 'Turn invisible in dim light or darkness while still.', minLevel: 5 },
  { id: 'Otherworldly Leap', name: 'Otherworldly Leap', description: 'Cast Jump on yourself at will.', minLevel: 9 },
  { id: 'Repelling Blast', name: 'Repelling Blast', description: 'Push creatures hit by Eldritch Blast 10 feet away.', requiresKnownSpells: ['Eldritch Blast'] },
  { id: 'Sculptor of Flesh', name: 'Sculptor of Flesh', description: 'Cast Polymorph once using a warlock spell slot.', minLevel: 7 },
  { id: 'Thief of Five Fates', name: 'Thief of Five Fates', description: 'Cast Bane once using a warlock spell slot.' },
  { id: 'Thirsting Blade', name: 'Thirsting Blade', description: 'Attack twice with your pact weapon when you take the Attack action.', requiresChoices: [{ choiceId: 'warlock-pact-boon-choice', optionIds: ['Pact of the Blade'] }], minLevel: 5 },
  { id: 'Voice of the Chain Master', name: 'Voice of the Chain Master', description: 'Communicate through and perceive via your familiar.', requiresChoices: [{ choiceId: 'warlock-pact-boon-choice', optionIds: ['Pact of the Chain'] }] },
  { id: 'Whispers of the Grave', name: 'Whispers of the Grave', description: 'Cast Speak with Dead at will.', minLevel: 9 },
  { id: 'Witch Sight', name: 'Witch Sight', description: 'See the true form of shapechangers and illusion-disguised creatures.', minLevel: 15 },
]

const INVOCATION_SKILL_GRANTS: Record<string, string[]> = {
  'Beguiling Influence': ['Deception', 'Persuasion'],
}

const ALL_FEATURE_CHOICE_DEFINITIONS: FeatureChoiceDefinition[] = [
  {
    id: 'fighter-fighting-style-choice',
    featureId: 'fighter-fighting-style',
    className: 'Fighter',
    level: 1,
    prompt: 'Choose 1 Fighting Style',
    count: 1,
    kind: 'fighting_style',
    options: FIGHTING_STYLE_OPTIONS.fighter,
  },
  {
    id: 'paladin-fighting-style-choice',
    featureId: 'paladin-fighting-style',
    className: 'Paladin',
    level: 2,
    prompt: 'Choose 1 Fighting Style',
    count: 1,
    kind: 'fighting_style',
    options: FIGHTING_STYLE_OPTIONS.paladin,
  },
  {
    id: 'ranger-fighting-style-choice',
    featureId: 'ranger-fighting-style',
    className: 'Ranger',
    level: 2,
    prompt: 'Choose 1 Fighting Style',
    count: 1,
    kind: 'fighting_style',
    options: FIGHTING_STYLE_OPTIONS.ranger,
  },
  {
    id: 'champion-additional-fighting-style-choice',
    featureId: 'champion-additional-fighting-style',
    className: 'Fighter',
    subclass: 'FighterChampion',
    level: 10,
    prompt: 'Choose an additional Fighting Style',
    count: 1,
    kind: 'fighting_style',
    options: FIGHTING_STYLE_OPTIONS.fighter,
  },
  {
    id: 'swords-fighting-style-choice',
    featureId: 'swords-fighting-style',
    className: 'Bard',
    subclass: 'BardCollegeOfSwords',
    level: 3,
    prompt: 'Choose 1 Fighting Style',
    count: 1,
    kind: 'fighting_style',
    options: FIGHTING_STYLE_OPTIONS.swords,
  },
  {
    id: 'rogue-expertise-choice',
    featureId: 'rogue-expertise',
    className: 'Rogue',
    level: 1,
    prompt: 'Choose 2 skills for Expertise',
    count: 2,
    kind: 'expertise',
    options: [],
  },
  {
    id: 'rogue-expertise-2-choice',
    featureId: 'rogue-expertise-2',
    className: 'Rogue',
    level: 6,
    prompt: 'Choose 2 more skills for Expertise',
    count: 2,
    kind: 'expertise',
    options: [],
  },
  {
    id: 'bard-expertise-choice',
    featureId: 'bard-expertise',
    className: 'Bard',
    level: 3,
    prompt: 'Choose 2 skills for Expertise',
    count: 2,
    kind: 'expertise',
    options: [],
  },
  {
    id: 'ranger-favored-enemy-choice',
    featureId: 'ranger-favored-enemy',
    className: 'Ranger',
    level: 1,
    prompt: 'Choose 1 Favored Enemy',
    count: 1,
    kind: 'choice',
    options: FAVORED_ENEMY_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'ranger-favored-enemy',
  },
  {
    id: 'ranger-natural-explorer-choice',
    featureId: 'ranger-natural-explorer',
    className: 'Ranger',
    level: 1,
    prompt: 'Choose 1 Favored Terrain',
    count: 1,
    kind: 'choice',
    options: NATURAL_EXPLORER_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'ranger-natural-explorer',
  },
  {
    id: 'ranger-favored-enemy-6-choice',
    featureId: 'ranger-favored-enemy',
    className: 'Ranger',
    level: 6,
    prompt: 'Choose 1 additional Favored Enemy',
    count: 1,
    kind: 'choice',
    options: FAVORED_ENEMY_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'ranger-favored-enemy',
  },
  {
    id: 'ranger-natural-explorer-6-choice',
    featureId: 'ranger-natural-explorer',
    className: 'Ranger',
    level: 6,
    prompt: 'Choose 1 additional Favored Terrain',
    count: 1,
    kind: 'choice',
    options: NATURAL_EXPLORER_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'ranger-natural-explorer',
  },
  {
    id: 'ranger-natural-explorer-10-choice',
    featureId: 'ranger-natural-explorer',
    className: 'Ranger',
    level: 10,
    prompt: 'Choose 1 additional Favored Terrain',
    count: 1,
    kind: 'choice',
    options: NATURAL_EXPLORER_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'ranger-natural-explorer',
  },
  {
    id: 'ranger-favored-enemy-14-choice',
    featureId: 'ranger-favored-enemy',
    className: 'Ranger',
    level: 14,
    prompt: 'Choose 1 additional Favored Enemy',
    count: 1,
    kind: 'choice',
    options: FAVORED_ENEMY_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'ranger-favored-enemy',
  },
  {
    id: 'hunter-hunters-prey-choice',
    featureId: 'ranger-hunter-hunters-prey',
    className: 'Ranger',
    subclass: 'RangerHunter',
    level: 3,
    prompt: 'Choose 1 Hunter’s Prey option',
    count: 1,
    kind: 'choice',
    options: HUNTERS_PREY_OPTIONS,
  },
  {
    id: 'hunter-defensive-tactics-choice',
    featureId: 'ranger-hunter-defensive-tactics',
    className: 'Ranger',
    subclass: 'RangerHunter',
    level: 7,
    prompt: 'Choose 1 Defensive Tactics option',
    count: 1,
    kind: 'choice',
    options: DEFENSIVE_TACTICS_OPTIONS,
  },
  {
    id: 'hunter-multiattack-choice',
    featureId: 'ranger-hunter-multiattack',
    className: 'Ranger',
    subclass: 'RangerHunter',
    level: 11,
    prompt: 'Choose 1 Hunter Multiattack option',
    count: 1,
    kind: 'choice',
    options: HUNTER_MULTIATTACK_OPTIONS,
  },
  {
    id: 'hunter-superior-defense-choice',
    featureId: 'ranger-hunter-superior-hunters-defense',
    className: 'Ranger',
    subclass: 'RangerHunter',
    level: 15,
    prompt: 'Choose 1 Superior Hunter’s Defense option',
    count: 1,
    kind: 'choice',
    options: SUPERIOR_HUNTERS_DEFENSE_OPTIONS,
  },
  {
    id: 'totem-warrior-spirit-choice',
    featureId: 'totemwarrior-totem-spirit',
    className: 'Barbarian',
    subclass: 'BarbarianPathOfTheTotemWarrior',
    level: 3,
    prompt: 'Choose 1 Totem Spirit',
    count: 1,
    kind: 'choice',
    options: TOTEM_WARRIOR_OPTIONS,
  },
  {
    id: 'totem-warrior-aspect-choice',
    featureId: 'totemwarrior-aspect-of-the-beast',
    className: 'Barbarian',
    subclass: 'BarbarianPathOfTheTotemWarrior',
    level: 6,
    prompt: 'Choose 1 Aspect of the Beast',
    count: 1,
    kind: 'choice',
    options: TOTEM_WARRIOR_OPTIONS,
  },
  {
    id: 'totem-warrior-attunement-choice',
    featureId: 'totemwarrior-totemic-attunement',
    className: 'Barbarian',
    subclass: 'BarbarianPathOfTheTotemWarrior',
    level: 14,
    prompt: 'Choose 1 Totemic Attunement',
    count: 1,
    kind: 'choice',
    options: TOTEM_WARRIOR_OPTIONS,
  },
  {
    id: 'four-elements-discipline-choice',
    featureId: 'fourelements-disciple-of-the-elements',
    className: 'Monk',
    subclass: 'MonkWayOfTheFourElements',
    level: 3,
    prompt: 'Choose 1 Elemental Discipline',
    count: 1,
    kind: 'choice',
    options: FOUR_ELEMENTS_DISCIPLINE_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'fourelements-disciple-of-the-elements',
  },
  {
    id: 'four-elements-discipline-6-choice',
    featureId: 'fourelements-disciple-of-the-elements',
    className: 'Monk',
    subclass: 'MonkWayOfTheFourElements',
    level: 6,
    prompt: 'Choose 1 additional Elemental Discipline',
    count: 1,
    kind: 'choice',
    options: FOUR_ELEMENTS_DISCIPLINE_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'fourelements-disciple-of-the-elements',
  },
  {
    id: 'four-elements-discipline-11-choice',
    featureId: 'fourelements-disciple-of-the-elements',
    className: 'Monk',
    subclass: 'MonkWayOfTheFourElements',
    level: 11,
    prompt: 'Choose 1 additional Elemental Discipline',
    count: 1,
    kind: 'choice',
    options: FOUR_ELEMENTS_DISCIPLINE_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'fourelements-disciple-of-the-elements',
  },
  {
    id: 'four-elements-discipline-17-choice',
    featureId: 'fourelements-disciple-of-the-elements',
    className: 'Monk',
    subclass: 'MonkWayOfTheFourElements',
    level: 17,
    prompt: 'Choose 1 additional Elemental Discipline',
    count: 1,
    kind: 'choice',
    options: FOUR_ELEMENTS_DISCIPLINE_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'fourelements-disciple-of-the-elements',
  },
  {
    id: 'kensei-melee-weapon-choice',
    featureId: 'kensei-kensei-weapons',
    className: 'Monk',
    subclass: 'MonkWayOfTheKensei',
    level: 3,
    prompt: 'Choose 1 melee Kensei weapon',
    count: 1,
    kind: 'choice',
    options: KENSEI_MELEE_WEAPON_OPTIONS,
  },
  {
    id: 'kensei-ranged-weapon-choice',
    featureId: 'kensei-kensei-weapons',
    className: 'Monk',
    subclass: 'MonkWayOfTheKensei',
    level: 3,
    prompt: 'Choose 1 ranged Kensei weapon',
    count: 1,
    kind: 'choice',
    options: KENSEI_RANGED_WEAPON_OPTIONS,
  },
  {
    id: 'arcane-archer-lore-skill',
    featureId: 'arcanearcher-arcane-archer-lore',
    className: 'Fighter',
    subclass: 'FighterArcaneArcher',
    level: 3,
    prompt: 'Choose 1 skill proficiency for Arcane Archer Lore',
    count: 1,
    kind: 'skill',
    options: [
      { id: 'Arcana', name: 'Arcana' },
      { id: 'Nature', name: 'Nature' },
    ],
  },
  {
    id: 'arcane-archer-lore-cantrip',
    featureId: 'arcanearcher-arcane-archer-lore',
    className: 'Fighter',
    subclass: 'FighterArcaneArcher',
    level: 3,
    prompt: 'Choose 1 cantrip for Arcane Archer Lore',
    count: 1,
    kind: 'cantrip',
    options: [
      { id: 'Prestidigitation', name: 'Prestidigitation' },
      { id: 'Druidcraft', name: 'Druidcraft' },
    ],
  },
  {
    id: 'arcane-shot-options',
    featureId: 'arcanearcher-arcane-shot',
    className: 'Fighter',
    subclass: 'FighterArcaneArcher',
    level: 3,
    prompt: 'Choose 2 Arcane Shot options',
    count: 2,
    kind: 'resource_option',
    addToResourceKey: 'arcane_shot',
    options: [
      { id: 'Banishing Arrow', name: 'Banishing Arrow', description: 'Force a hit creature toward the Feywild until the end of its next turn.' },
      { id: 'Beguiling Arrow', name: 'Beguiling Arrow', description: 'Charm the target toward another creature you choose.' },
      { id: 'Bursting Arrow', name: 'Bursting Arrow', description: 'Detonate force energy to damage the target and nearby creatures.' },
      { id: 'Enfeebling Arrow', name: 'Enfeebling Arrow', description: 'Sap the target so its weapon attacks deal half damage.' },
      { id: 'Grasping Arrow', name: 'Grasping Arrow', description: 'Wrap brambles around the target that deal damage when it moves.' },
      { id: 'Piercing Arrow', name: 'Piercing Arrow', description: 'Fire a line of energy that can strike every creature in its path.' },
      { id: 'Seeking Arrow', name: 'Seeking Arrow', description: 'Curve the shot toward a known target even without line of sight.' },
      { id: 'Shadow Arrow', name: 'Shadow Arrow', description: 'Shroud the target in shadow and limit its vision.' },
    ],
  },
  {
    id: 'battlemaster-combat-superiority-choice',
    featureId: 'battlemaster-combat-superiority',
    className: 'Fighter',
    subclass: 'FighterBattleMaster',
    level: 3,
    prompt: 'Choose 4 maneuvers for Combat Superiority',
    count: 4,
    kind: 'resource_option',
    addToResourceKey: 'superiority_dice',
    options: BATTLE_MASTER_MANEUVERS,
  },
  {
    id: 'sorcerer-metamagic-choice',
    featureId: 'sorcerer-metamagic',
    className: 'Sorcerer',
    level: 3,
    prompt: 'Choose 2 Metamagic options',
    count: 2,
    kind: 'resource_option',
    addToResourceKey: 'sorcery_points',
    options: METAMAGIC_OPTIONS,
  },
  {
    id: 'sorcerer-metamagic-10-choice',
    featureId: 'sorcerer-metamagic',
    className: 'Sorcerer',
    level: 10,
    prompt: 'Choose 1 additional Metamagic option',
    count: 1,
    kind: 'resource_option',
    addToResourceKey: 'sorcery_points',
    options: METAMAGIC_OPTIONS,
  },
  {
    id: 'sorcerer-metamagic-17-choice',
    featureId: 'sorcerer-metamagic',
    className: 'Sorcerer',
    level: 17,
    prompt: 'Choose 1 additional Metamagic option',
    count: 1,
    kind: 'resource_option',
    addToResourceKey: 'sorcery_points',
    options: METAMAGIC_OPTIONS,
  },
  {
    id: 'warlock-eldritch-invocations-choice',
    featureId: 'warlock-eldritch-invocations',
    className: 'Warlock',
    level: 2,
    prompt: 'Choose 2 Eldritch Invocations',
    count: 2,
    kind: 'choice',
    options: ELDRITCH_INVOCATION_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'warlock-eldritch-invocations',
  },
  {
    id: 'warlock-pact-boon-choice',
    featureId: 'warlock-pact-boon',
    className: 'Warlock',
    level: 3,
    prompt: 'Choose 1 Pact Boon',
    count: 1,
    kind: 'choice',
    options: PACT_BOON_OPTIONS,
  },
  {
    id: 'warlock-pact-of-the-tome-cantrips-choice',
    featureId: 'warlock-pact-boon',
    className: 'Warlock',
    level: 3,
    prompt: 'Choose 3 bonus cantrips for Pact of the Tome',
    count: 3,
    kind: 'cantrip',
    options: [],
    requiresChoices: [{ choiceId: 'warlock-pact-boon-choice', optionIds: ['Pact of the Tome'] }],
  },
  {
    id: 'warlock-eldritch-invocations-5-choice',
    featureId: 'warlock-eldritch-invocations',
    className: 'Warlock',
    level: 5,
    prompt: 'Choose 1 additional Eldritch Invocation',
    count: 1,
    kind: 'choice',
    options: ELDRITCH_INVOCATION_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'warlock-eldritch-invocations',
  },
  {
    id: 'warlock-eldritch-invocations-7-choice',
    featureId: 'warlock-eldritch-invocations',
    className: 'Warlock',
    level: 7,
    prompt: 'Choose 1 additional Eldritch Invocation',
    count: 1,
    kind: 'choice',
    options: ELDRITCH_INVOCATION_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'warlock-eldritch-invocations',
  },
  {
    id: 'warlock-eldritch-invocations-9-choice',
    featureId: 'warlock-eldritch-invocations',
    className: 'Warlock',
    level: 9,
    prompt: 'Choose 1 additional Eldritch Invocation',
    count: 1,
    kind: 'choice',
    options: ELDRITCH_INVOCATION_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'warlock-eldritch-invocations',
  },
  {
    id: 'warlock-eldritch-invocations-12-choice',
    featureId: 'warlock-eldritch-invocations',
    className: 'Warlock',
    level: 12,
    prompt: 'Choose 1 additional Eldritch Invocation',
    count: 1,
    kind: 'choice',
    options: ELDRITCH_INVOCATION_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'warlock-eldritch-invocations',
  },
  {
    id: 'warlock-eldritch-invocations-15-choice',
    featureId: 'warlock-eldritch-invocations',
    className: 'Warlock',
    level: 15,
    prompt: 'Choose 1 additional Eldritch Invocation',
    count: 1,
    kind: 'choice',
    options: ELDRITCH_INVOCATION_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'warlock-eldritch-invocations',
  },
  {
    id: 'warlock-eldritch-invocations-18-choice',
    featureId: 'warlock-eldritch-invocations',
    className: 'Warlock',
    level: 18,
    prompt: 'Choose 1 additional Eldritch Invocation',
    count: 1,
    kind: 'choice',
    options: ELDRITCH_INVOCATION_OPTIONS,
    excludeSelectedOptionsFromFeatureId: 'warlock-eldritch-invocations',
  },
  {
    id: 'artificer-infusions-choice',
    featureId: 'artificer-infuse-item',
    className: 'Artificer',
    level: 2,
    prompt: 'Choose 4 Artificer Infusions',
    count: 4,
    kind: 'resource_option',
    addToResourceKey: 'infusions',
    options: INFUSION_OPTIONS,
  },
  {
    id: 'artificer-infusions-6-choice',
    featureId: 'artificer-infuse-item',
    className: 'Artificer',
    level: 6,
    prompt: 'Choose 2 additional Artificer Infusions',
    count: 2,
    kind: 'resource_option',
    addToResourceKey: 'infusions',
    options: INFUSION_OPTIONS,
  },
  {
    id: 'artificer-infusions-10-choice',
    featureId: 'artificer-infuse-item',
    className: 'Artificer',
    level: 10,
    prompt: 'Choose 2 additional Artificer Infusions',
    count: 2,
    kind: 'resource_option',
    addToResourceKey: 'infusions',
    options: INFUSION_OPTIONS,
  },
  {
    id: 'artificer-infusions-14-choice',
    featureId: 'artificer-infuse-item',
    className: 'Artificer',
    level: 14,
    prompt: 'Choose 2 additional Artificer Infusions',
    count: 2,
    kind: 'resource_option',
    addToResourceKey: 'infusions',
    options: INFUSION_OPTIONS,
  },
  {
    id: 'artificer-infusions-18-choice',
    featureId: 'artificer-infuse-item',
    className: 'Artificer',
    level: 18,
    prompt: 'Choose 2 additional Artificer Infusions',
    count: 2,
    kind: 'resource_option',
    addToResourceKey: 'infusions',
    options: INFUSION_OPTIONS,
  },
  {
    id: 'warlock-mystic-arcanum-6-choice',
    featureId: 'warlock-mystic-arcanum',
    className: 'Warlock',
    level: 11,
    prompt: 'Choose 1 Mystic Arcanum spell (6th level)',
    count: 1,
    kind: 'spell',
    options: [],
  },
  {
    id: 'warlock-mystic-arcanum-7-choice',
    featureId: 'warlock-mystic-arcanum-2',
    className: 'Warlock',
    level: 13,
    prompt: 'Choose 1 Mystic Arcanum spell (7th level)',
    count: 1,
    kind: 'spell',
    options: [],
  },
  {
    id: 'warlock-mystic-arcanum-8-choice',
    featureId: 'warlock-mystic-arcanum-3',
    className: 'Warlock',
    level: 15,
    prompt: 'Choose 1 Mystic Arcanum spell (8th level)',
    count: 1,
    kind: 'spell',
    options: [],
  },
  {
    id: 'warlock-mystic-arcanum-9-choice',
    featureId: 'warlock-mystic-arcanum-4',
    className: 'Warlock',
    level: 17,
    prompt: 'Choose 1 Mystic Arcanum spell (9th level)',
    count: 1,
    kind: 'spell',
    options: [],
  },
  {
    id: 'wizard-spell-mastery-1-choice',
    featureId: 'wizard-spell-mastery',
    className: 'Wizard',
    level: 18,
    prompt: 'Choose 1 1st-level spell for Spell Mastery',
    count: 1,
    kind: 'spell',
    options: [],
  },
  {
    id: 'wizard-spell-mastery-2-choice',
    featureId: 'wizard-spell-mastery',
    className: 'Wizard',
    level: 18,
    prompt: 'Choose 1 2nd-level spell for Spell Mastery',
    count: 1,
    kind: 'spell',
    options: [],
  },
  {
    id: 'wizard-signature-spells-choice',
    featureId: 'wizard-signature-spells',
    className: 'Wizard',
    level: 20,
    prompt: 'Choose 2 3rd-level spells for Signature Spells',
    count: 2,
    kind: 'spell',
    options: [],
  },
]

const DEFINITION_BY_ID = Object.fromEntries(ALL_FEATURE_CHOICE_DEFINITIONS.map(definition => [definition.id, definition]))

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function getCombinedSelections(
  featureChoices: CharacterFeatureChoice[] | undefined,
  pendingSelections: Record<string, string[]> | undefined,
): Record<string, string[]> {
  const combined = new Map<string, Set<string>>()

  for (const choice of featureChoices ?? []) {
    combined.set(choice.choiceId, new Set(choice.selectedOptionIds))
  }

  for (const [choiceId, optionIds] of Object.entries(pendingSelections ?? {})) {
    const current = combined.get(choiceId) ?? new Set<string>()
    optionIds.forEach(optionId => current.add(optionId))
    combined.set(choiceId, current)
  }

  return Object.fromEntries(Array.from(combined.entries()).map(([choiceId, optionIds]) => [choiceId, Array.from(optionIds)]))
}

function meetsChoiceRequirements(
  requirements: ChoiceRequirement[] | undefined,
  selectionsByChoiceId: Record<string, string[]>,
): boolean {
  if (!requirements || requirements.length === 0) return true
  return requirements.every(requirement => {
    if (requirement.optionIds.length === 0) {
      return (selectionsByChoiceId[requirement.choiceId] ?? []).length > 0
    }
    return requirement.optionIds.some(optionId => (selectionsByChoiceId[requirement.choiceId] ?? []).includes(optionId))
  })
}

function meetsSpellRequirements(requiredSpellNames: string[] | undefined, knownSpellNames: Set<string>): boolean {
  if (!requiredSpellNames || requiredSpellNames.length === 0) return true
  return requiredSpellNames.every(spellName => knownSpellNames.has(spellName.toLowerCase()))
}

function getSelectionsForFeatureId(
  featureId: string | undefined,
  featureChoices: CharacterFeatureChoice[] | undefined,
  pendingSelections: Record<string, string[]> | undefined,
): string[] {
  if (!featureId) return []
  const selected = new Set<string>()

  for (const choice of featureChoices ?? []) {
    if (choice.featureId !== featureId) continue
    choice.selectedOptionIds.forEach(optionId => selected.add(optionId))
  }

  for (const [choiceId, optionIds] of Object.entries(pendingSelections ?? {})) {
    if (DEFINITION_BY_ID[choiceId]?.featureId !== featureId) continue
    optionIds.forEach(optionId => selected.add(optionId))
  }

  return Array.from(selected)
}

export function getFeatureChoiceSelectionsById(featureChoices: CharacterFeatureChoice[] | undefined): Record<string, string[]> {
  return Object.fromEntries((featureChoices ?? []).map(choice => [choice.choiceId, choice.selectedOptionIds]))
}

export function getFeatureChoiceDisplayMap(featureChoices: CharacterFeatureChoice[] | undefined): Record<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const choice of featureChoices ?? []) {
    grouped.set(choice.featureId, [...(grouped.get(choice.featureId) ?? []), ...choice.selectedOptionIds])
  }
  return Object.fromEntries(Array.from(grouped.entries()).map(([featureId, optionIds]) => [featureId, unique(optionIds)]))
}

export function getSelectedFightingStyles(featureChoices: CharacterFeatureChoice[] | undefined): string[] {
  return unique((featureChoices ?? [])
    .filter(choice => choice.kind === 'fighting_style')
    .flatMap(choice => choice.selectedOptionIds))
}

function getResourceOptionSelections(resourceKey: string | undefined, classResources: ClassResource[] | undefined): string[] {
  if (!resourceKey) return []
  return unique((classResources ?? [])
    .filter(resource => resource.resourceKey === resourceKey)
    .flatMap(resource => resource.selectedOptions ?? []))
}

function getExistingSelections(
  definition: FeatureChoiceDefinition,
  featureChoices: CharacterFeatureChoice[] | undefined,
  classResources: ClassResource[] | undefined,
  skillExpertise: string[] | undefined,
): string[] {
  if (definition.kind === 'resource_option') {
    return getResourceOptionSelections(definition.addToResourceKey, classResources)
  }

  if (definition.kind === 'expertise') {
    const stored = (featureChoices ?? [])
      .filter(choice => choice.kind === 'expertise')
      .flatMap(choice => choice.selectedOptionIds)
    return unique([...(skillExpertise ?? []), ...stored])
  }

  const stored = (featureChoices ?? []).find(choice => choice.choiceId === definition.id)
  return stored?.selectedOptionIds ?? []
}

export function getFeatureChoiceDefinitions({
  targetClass,
  subclass,
  level,
  previousLevel = level - 1,
  existingFeatureChoices = [],
  classResources = [],
  skillExpertise = [],
  pendingSelections = {},
  knownSpellNames = [],
}: FeatureChoiceContext): FeatureChoiceDefinition[] {
  const selectedFightingStyles = new Set(getSelectedFightingStyles(existingFeatureChoices))
  const selectedExpertise = new Set(unique([
    ...skillExpertise,
    ...existingFeatureChoices.filter(choice => choice.kind === 'expertise').flatMap(choice => choice.selectedOptionIds),
  ]))
  const combinedSelections = getCombinedSelections(existingFeatureChoices, pendingSelections)
  const knownSpellSet = new Set(knownSpellNames.map(spellName => spellName.toLowerCase()))

  return ALL_FEATURE_CHOICE_DEFINITIONS
    .filter(definition =>
      definition.className === targetClass &&
      definition.level === level &&
      definition.level > previousLevel &&
      (!definition.subclass || definition.subclass === subclass) &&
      meetsChoiceRequirements(definition.requiresChoices, combinedSelections))
    .map(definition => {
      let options = definition.options
      if (definition.kind === 'fighting_style') {
        options = definition.options.filter(option => !selectedFightingStyles.has(option.id))
      } else if (definition.kind === 'expertise') {
        options = definition.options.length > 0
          ? definition.options.filter(option => !selectedExpertise.has(option.id))
          : []
      } else if (definition.kind === 'resource_option') {
        const selectedOptions = new Set(getResourceOptionSelections(definition.addToResourceKey, classResources))
        options = definition.options.filter(option => !selectedOptions.has(option.id))
      } else if (definition.excludeSelectedOptionsFromFeatureId) {
        const selectedOptions = new Set(getSelectionsForFeatureId(
          definition.excludeSelectedOptionsFromFeatureId,
          existingFeatureChoices,
          pendingSelections,
        ))
        const currentSelections = new Set(pendingSelections[definition.id] ?? [])
        options = definition.options.filter(option => currentSelections.has(option.id) || !selectedOptions.has(option.id))
      }
      options = options.filter(option =>
        meetsChoiceRequirements(option.requiresChoices, combinedSelections) &&
        meetsSpellRequirements(option.requiresKnownSpells, knownSpellSet) &&
        (option.minLevel == null || level >= option.minLevel))
      return { ...definition, options }
    })
    .filter(definition => {
      const existing = getExistingSelections(definition, existingFeatureChoices, classResources, skillExpertise)
      return existing.length < definition.count || definition.options.length === 0
    })
}

export function withDynamicFeatureChoiceOptions(
  definitions: FeatureChoiceDefinition[],
  optionsByDefinitionId: Partial<Record<string, FeatureChoiceOption[]>>,
): FeatureChoiceDefinition[] {
  return definitions.map(definition => ({
    ...definition,
    options: optionsByDefinitionId[definition.id] ?? definition.options,
  }))
}

export function applyFeatureChoiceSelections(
  definitions: FeatureChoiceDefinition[],
  selections: Record<string, string[]>,
  existingFeatureChoices: CharacterFeatureChoice[] = [],
  existingClassResources: ClassResource[] = [],
): AppliedFeatureChoiceEffects {
  const persistedChoices = new Map(existingFeatureChoices.map(choice => [choice.choiceId, choice]))
  const resourceOptions = new Map<string, Set<string>>()
  const skillProficiencies = new Set<string>()
  const skillExpertise = new Set<string>()
  const spellNames = new Set<string>()

  for (const definition of definitions) {
    const selected = unique(selections[definition.id] ?? [])
    if (selected.length === 0) continue

    if (definition.kind === 'resource_option') {
      const current = new Set(getResourceOptionSelections(definition.addToResourceKey, existingClassResources))
      selected.forEach(optionId => current.add(optionId))
      if (definition.addToResourceKey) {
        resourceOptions.set(definition.addToResourceKey, current)
      }
      continue
    }

    persistedChoices.set(definition.id, {
      choiceId: definition.id,
      featureId: definition.featureId,
      kind: definition.kind,
      selectedOptionIds: selected,
    })

    if (definition.kind === 'skill') {
      selected.forEach(optionId => skillProficiencies.add(optionId))
    } else if (definition.kind === 'expertise') {
      selected.forEach(optionId => skillExpertise.add(optionId))
    } else if (definition.kind === 'cantrip' || definition.kind === 'spell') {
      selected.forEach(optionId => spellNames.add(optionId))
    }

    if (definition.featureId === 'warlock-eldritch-invocations') {
      selected
        .flatMap(optionId => INVOCATION_SKILL_GRANTS[optionId] ?? [])
        .forEach(skill => skillProficiencies.add(skill))
    }
  }

  return {
    skillProficiencies: Array.from(skillProficiencies),
    skillExpertise: Array.from(skillExpertise),
    spellNames: Array.from(spellNames),
    resourceOptions: Object.fromEntries(Array.from(resourceOptions.entries()).map(([key, value]) => [key, Array.from(value)])),
    persistedFeatureChoices: Array.from(persistedChoices.values()),
  }
}

export function mergeFeatureChoiceSelections(
  current: CharacterFeatureChoice[] | undefined,
  next: CharacterFeatureChoice[],
): CharacterFeatureChoice[] {
  const merged = new Map((current ?? []).map(choice => [choice.choiceId, choice]))
  for (const choice of next) {
    merged.set(choice.choiceId, choice)
  }
  return Array.from(merged.values())
}

export function featureChoiceSelectionsEqual(
  left: Record<string, string[]>,
  right: Record<string, string[]>,
): boolean {
  const keys = unique([...Object.keys(left), ...Object.keys(right)]).sort()
  return keys.every(key => arraysEqual(left[key] ?? [], right[key] ?? []))
}

const RESOURCE_OPTION_LOOKUP = new Map<string, Map<string, FeatureChoiceOption>>(
  ALL_FEATURE_CHOICE_DEFINITIONS
    .filter((definition) => definition.kind === 'resource_option' && !!definition.addToResourceKey)
    .map((definition) => [
      definition.addToResourceKey as string,
      new Map(definition.options.map(option => [option.id, option])),
    ]),
)

export function getResourceOptionInfo(resourceKey: string, optionId: string): FeatureChoiceOption | null {
  return RESOURCE_OPTION_LOOKUP.get(resourceKey)?.get(optionId) ?? null
}
