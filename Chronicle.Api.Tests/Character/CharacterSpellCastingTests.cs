using Chronicle.Api.Models;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Tests.Character;

/// <summary>
/// Tests CastSpell() behavior for all 24 classes.
/// Validates slot consumption, cantrip/ritual free-casting, and exhaustion rules.
/// </summary>
public class CharacterSpellCastingTests
{
    private static Models.Character MakeCharacter(Class cls, int maxLevel1Slots = 2) => new()
    {
        Name = "Test",
        CharacterClass = cls,
        GameType = cls is Class.Inquisitor or Class.Summoner or Class.Witch or Class.Alchemist
            or Class.Magus or Class.Oracle or Class.Shaman or Class.Spiritualist
            or Class.Occultist or Class.Psychic or Class.Mesmerist
            ? Game.pathfinder1e
            : Game.dnd5e,
        Level = 3,
        MaxSpellsPerDay = new Dictionary<int, int> { [1] = maxLevel1Slots, [2] = 1 },
        SpellsUsedToday = new Dictionary<int, int> { [1] = 0, [2] = 0 },
    };

    // All spellcasting classes that have slot-based casting
    public static IEnumerable<object[]> SpellcastingClasses() =>
    [
        [Class.Bard],
        [Class.Cleric],
        [Class.Druid],
        [Class.Paladin],
        [Class.Ranger],
        [Class.Sorcerer],
        [Class.Wizard],
        [Class.Warlock],
        [Class.Artificer],
        [Class.Inquisitor],
        [Class.Summoner],
        [Class.Witch],
        [Class.Magus],
        [Class.Oracle],
        [Class.Shaman],
        [Class.Spiritualist],
        [Class.Occultist],
        [Class.Psychic],
        [Class.Mesmerist],
    ];

    // Non-spellcasting classes that don't use spell slots
    public static IEnumerable<object[]> NonSpellcastingClasses() =>
    [
        [Class.Barbarian],
        [Class.Fighter],
        [Class.Monk],
        [Class.Rogue],
        [Class.Alchemist],
    ];

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_WithSlotsAvailable_ReturnsTrue(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 2);

        var result = character.CastSpell(1);

        Assert.True(result);
    }

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_ConsumesSlot_WhenSuccessful(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 2);

        character.CastSpell(1);

        Assert.Equal(1, character.SpellsUsedToday[1]);
    }

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_WhenAllSlotsExhausted_ReturnsFalse(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 1);
        character.SpellsUsedToday[1] = 1; // already used the only slot

        var result = character.CastSpell(1);

        Assert.False(result);
    }

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_DoesNotIncrementUsed_WhenSlotsExhausted(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 1);
        character.SpellsUsedToday[1] = 1;

        character.CastSpell(1);

        Assert.Equal(1, character.SpellsUsedToday[1]);
    }

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_Cantrip_AlwaysSucceeds_EvenWithNoSlots(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 0);
        character.MaxSpellsPerDay.Clear();
        character.SpellsUsedToday.Clear();

        var result = character.CastSpell(0); // cantrip

        Assert.True(result);
    }

    [Theory]
    [MemberData(nameof(NonSpellcastingClasses))]
    public void CastSpell_Cantrip_AlwaysSucceeds_ForNonSpellcastingClasses(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 0);
        character.MaxSpellsPerDay.Clear();
        character.SpellsUsedToday.Clear();

        var result = character.CastSpell(0);

        Assert.True(result);
    }

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_Ritual_AlwaysSucceeds_EvenWithNoSlots(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 0);
        character.MaxSpellsPerDay.Clear();
        character.SpellsUsedToday.Clear();

        var result = character.CastSpell(-1); // ritual

        Assert.True(result);
    }

    [Theory]
    [MemberData(nameof(NonSpellcastingClasses))]
    public void CastSpell_Ritual_AlwaysSucceeds_ForNonSpellcastingClasses(Class cls)
    {
        var character = MakeCharacter(cls, maxLevel1Slots: 0);
        character.MaxSpellsPerDay.Clear();
        character.SpellsUsedToday.Clear();

        var result = character.CastSpell(-1);

        Assert.True(result);
    }

    [Theory]
    [MemberData(nameof(NonSpellcastingClasses))]
    public void CastSpell_LeveledSpell_WithNoSlotsConfigured_ReturnsFalse(Class cls)
    {
        var character = MakeCharacter(cls);
        character.MaxSpellsPerDay.Clear();
        character.SpellsUsedToday.Clear();

        var result = character.CastSpell(1);

        Assert.False(result);
    }

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_Level2_UsesLevel2Slots_Independently(Class cls)
    {
        var character = MakeCharacter(cls);

        var result = character.CastSpell(2);

        Assert.True(result);
        Assert.Equal(0, character.SpellsUsedToday[1]); // level 1 unaffected
        Assert.Equal(1, character.SpellsUsedToday[2]);
    }

    [Theory]
    [MemberData(nameof(SpellcastingClasses))]
    public void CastSpell_MissingSpellLevelInDicts_ReturnsFalse(Class cls)
    {
        var character = MakeCharacter(cls);
        // Level 9 not configured at all

        var result = character.CastSpell(9);

        Assert.False(result);
    }

    [Fact]
    public void Wizard_CanCastMultipleSpells_UntilSlotsRun_Out()
    {
        var wizard = MakeCharacter(Class.Wizard, maxLevel1Slots: 3);

        Assert.True(wizard.CastSpell(1));
        Assert.True(wizard.CastSpell(1));
        Assert.True(wizard.CastSpell(1));
        Assert.False(wizard.CastSpell(1)); // 4th cast with only 3 slots
    }

    [Fact]
    public void Cleric_CanCastCantripAfterSlotsExhausted()
    {
        var cleric = MakeCharacter(Class.Cleric, maxLevel1Slots: 1);
        cleric.SpellsUsedToday[1] = 1;

        Assert.False(cleric.CastSpell(1));  // no level 1 slots left
        Assert.True(cleric.CastSpell(0));   // cantrip still free
    }

    [Fact]
    public void Druid_CanCastRitualAfterSlotsExhausted()
    {
        var druid = MakeCharacter(Class.Druid, maxLevel1Slots: 1);
        druid.SpellsUsedToday[1] = 1;

        Assert.False(druid.CastSpell(1));   // no slots
        Assert.True(druid.CastSpell(-1));   // ritual always free
    }

    [Fact]
    public void Barbarian_HasNoSpellSlotsByDefault_CannotCastLeveledSpells()
    {
        var barbarian = new Models.Character
        {
            Name = "Grog",
            CharacterClass = Class.Barbarian,
            GameType = Game.dnd5e,
            Level = 5,
        };

        Assert.False(barbarian.CastSpell(1));
        Assert.False(barbarian.CastSpell(2));
    }

    [Fact]
    public void Fighter_HasNoSpellSlotsByDefault_CannotCastLeveledSpells()
    {
        var fighter = new Models.Character
        {
            Name = "Bryn",
            CharacterClass = Class.Fighter,
            GameType = Game.dnd5e,
            Level = 5,
        };

        Assert.False(fighter.CastSpell(1));
    }

    // --- Corner cases ---

    [Fact]
    public void CastSpell_WhenMaxSpellsPerDayHasKey_ButSpellsUsedTodayDoesNot_ReturnsFalse()
    {
        // Both dicts must have the key — if SpellsUsedToday is missing it, cast fails
        var wizard = new Models.Character
        {
            Name = "Test",
            CharacterClass = Class.Wizard,
            GameType = Game.dnd5e,
            Level = 1,
            MaxSpellsPerDay = new Dictionary<int, int> { [1] = 3 },
            SpellsUsedToday = new Dictionary<int, int>(), // key 1 NOT present
        };

        Assert.False(wizard.CastSpell(1));
    }

    [Fact]
    public void CastSpell_WhenSpellsUsedTodayHasKey_ButMaxSpellsPerDayDoesNot_ReturnsFalse()
    {
        var wizard = new Models.Character
        {
            Name = "Test",
            CharacterClass = Class.Wizard,
            GameType = Game.dnd5e,
            Level = 1,
            MaxSpellsPerDay = new Dictionary<int, int>(), // key 1 NOT present
            SpellsUsedToday = new Dictionary<int, int> { [1] = 0 },
        };

        Assert.False(wizard.CastSpell(1));
    }

    [Fact]
    public void CastSpell_WhenMaxSlotsIsZero_AlwaysReturnsFalse()
    {
        // A slot configured with max = 0 can never be used
        var wizard = new Models.Character
        {
            Name = "Test",
            CharacterClass = Class.Wizard,
            GameType = Game.dnd5e,
            Level = 1,
            MaxSpellsPerDay = new Dictionary<int, int> { [1] = 0 },
            SpellsUsedToday = new Dictionary<int, int> { [1] = 0 },
        };

        Assert.False(wizard.CastSpell(1));
    }

    [Fact]
    public void CastSpell_NegativeSpellLevel_OtherThanRitual_ReturnsFalse()
    {
        // Only -1 is treated as ritual; other negative values fall through to slot check
        var wizard = MakeCharacter(Class.Wizard, maxLevel1Slots: 3);

        Assert.False(wizard.CastSpell(-2));
    }

    [Fact]
    public void CastSpell_ConsecutiveCasts_IncrementUsedEachTime()
    {
        var sorcerer = MakeCharacter(Class.Sorcerer, maxLevel1Slots: 4);

        sorcerer.CastSpell(1);
        sorcerer.CastSpell(1);
        sorcerer.CastSpell(1);

        Assert.Equal(3, sorcerer.SpellsUsedToday[1]);
    }
}
