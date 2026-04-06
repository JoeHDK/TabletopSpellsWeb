# Release Notes — Chronicle

## [Unreleased] — April 6, 2026

### ✨ Level Up Wizard: Class Resource Notifications
When leveling up, the wizard now shows a dedicated **"Class Resources"** step whenever your class gains a new resource or an existing one upgrades. Resources are displayed with a **NEW** badge (green) for first-time grants or an **↑** badge (yellow) for upgrades. The summary screen also lists all resource changes at a glance.

**Classes covered:** Fighter (Second Wind, Action Surge, Indomitable), Barbarian (Rage), Cleric (Channel Divinity, Divine Intervention), Paladin (Divine Sense, Lay on Hands, Channel Divinity, Cleansing Touch), Monk (Ki Points), Sorcerer (Sorcery Points), Warlock (Pact Magic Slots, Mystic Arcanum), Bard (Bardic Inspiration), Artificer (Infusions, Arcane Firearm).

---

## [v0.9] — April 6, 2026

### 🧙 Multiclassing
- **Add a second (or third) class** via the identity card. Supports all 13 D&D 5e classes.
- Each class combination validates PHB prerequisites (ability score minimums).
- The identity card shows each class on its own row with level and subclass.
- Classes track their own levels, subclasses, and spell progression independently.
- Remove a class from the identity card to revert to single-class.

### ⬆️ Level Up Wizard
- Step-by-step modal for leveling up. Walks you through:
  1. **HP gain** — choose to roll or take average; Constitution modifier applied automatically.
  2. **Spell slots info** — prepared casters see updated slot counts; no picking required.
  3. **Pick spells/cantrips** — known casters (Bard, Sorcerer, Warlock, Ranger) choose new spells from the appropriate class list, capped at the correct spell level for their class level.
  4. **Subclass selection** — prompted at the right class level per PHB (e.g. Fighter 3, Cleric 1).
  5. **ASI or Feat** — at the right levels; feat picker with search.
  6. **Summary** — review all choices before confirming.
- **Multiclass spell slots** are computed using the PHB combined caster level table. Warlock Pact Magic slots are tracked separately from the shared pool.
- **Spell Save DC and Spell Attack Bonus** correctly resolve for multiclass characters where the primary class is non-caster (e.g. Fighter/Wizard shows Wizard's INT-based bonus).
- **Level Down** — undo the last level-up. Reverts HP, spells, feats, ASIs via a stored snapshot.
- **Level Up banner** prompts from the character list when any character is ready to level up.

### 🎭 Multiclass Proficiency Grants
When adding a second class, the **Add Class** modal now has a two-step flow:
- **Step 1:** Choose class and starting level.
- **Step 2:** Review and confirm proficiency gains per PHB p.164:
  - Saving throws auto-checked (uncheck any you already have).
  - Skill proficiency picks from the class list (or any skill for Bard).
  - Already-proficient items shown with strikethrough and excluded from pickers.

---

## [v0.8] — April 5, 2026

### 🧝 Identity Card Redesign
- New layout matching design mockup: Race + Subrace on one row, Name + Level on same row, Class + Subclass below, avatar as a fixed circle spanning the full card height.
- Avatar is always a perfect circle (no stretching).
- Race label now displayed inside the race selector for clarity.
- Subrace shown as `Race – Subrace` format.

### 🌍 Races & Subraces
- **Tiefling subraces** added (Asmodeus, Baalzebul, Dispater, Fierna, Glasya, Levistus, Mammon, Mephistopheles, Zariel).
- **Githyanki** added as a top-level race (was missing).
- **Variant Human** now shows a skill proficiency picker in the race choices panel — choose 1 skill proficiency as per PHB.
- Fixed race `parent_race` serialization issue that caused subrace selection to fail.
- Removed non-official subclasses to keep the list aligned with published sourcebooks.

### 🎖️ Feats
- **Class-restricted feats** — feats with class prerequisites (e.g. Elven Accuracy for Elves, Fighting Initiate for martial classes) are now only shown to eligible characters.
- **Custom feats** — DMs can create homebrew feats for their campaign.
- **Custom feat stat modifiers** — custom feats can grant ability score bonuses, saving throw bonuses, skill proficiencies, and more.

### 🐛 Bug Fixes
- Fixed HP popup clipping off the top of the screen when the character was near the top of the list.
- Fixed class resources becoming stale after using the sync button — now always reflects the correct values for the character's current level.
- Fixed `EditableNumber` popup flipping to the wrong side on mobile/small screens.
- Fixed class abilities section always appearing expanded on load.
- Fixed skill proficiency field name mismatch on the Feats page.
- Cleaned up class skill proficiency grants for accuracy.
