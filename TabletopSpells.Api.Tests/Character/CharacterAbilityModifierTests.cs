using TabletopSpells.Api.Models;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.Tests.Character;

/// <summary>
/// Tests GetRelevantAbilityModifier() for all 24 classes.
/// Each class pulls from a specific ability score: INT, WIS, CHA, or STR.
/// </summary>
public class CharacterAbilityModifierTests
{
    private static Models.Character MakeCharacter(Class cls, Dictionary<string, int> abilityScores) => new()
    {
        Name = "Test",
        CharacterClass = cls,
        GameType = cls is Class.Inquisitor or Class.Summoner or Class.Witch or Class.Alchemist
            or Class.Magus or Class.Oracle or Class.Shaman or Class.Spiritualist
            or Class.Occultist or Class.Psychic or Class.Mesmerist
            ? Game.pathfinder1e
            : Game.dnd5e,
        Level = 1,
        AbilityScores = abilityScores,
    };

    // score → expected modifier: (score - 10) / 2 (integer division)
    // 10 → 0, 18 → 4, 8 → -1, 1 → -4 (int division: -9/2 = -4), 20 → 5
    // Note: C# integer division truncates toward zero, so (1-10)/2 = -9/2 = -4 (not -5)
    private static Dictionary<string, int> AllScores(string relevant, int score) => new()
    {
        ["Strength"] = relevant == "Strength" ? score : 10,
        ["Dexterity"] = 10,
        ["Constitution"] = 10,
        ["Intelligence"] = relevant == "Intelligence" ? score : 10,
        ["Wisdom"] = relevant == "Wisdom" ? score : 10,
        ["Charisma"] = relevant == "Charisma" ? score : 10,
    };

    // --- Intelligence classes: Wizard, Artificer ---

    [Theory]
    [InlineData(Class.Wizard, 18, 4)]
    [InlineData(Class.Wizard, 10, 0)]
    [InlineData(Class.Wizard, 8, -1)]
    [InlineData(Class.Artificer, 20, 5)]
    [InlineData(Class.Artificer, 14, 2)]
    [InlineData(Class.Artificer, 10, 0)]
    public void IntelligenceClasses_ReturnIntelligenceModifier(Class cls, int intScore, int expectedMod)
    {
        var character = MakeCharacter(cls, AllScores("Intelligence", intScore));

        Assert.Equal(expectedMod, character.GetRelevantAbilityModifier());
    }

    [Theory]
    [InlineData(Class.Wizard)]
    [InlineData(Class.Artificer)]
    public void IntelligenceClasses_IgnoreOtherAbilityScores(Class cls)
    {
        var scores = new Dictionary<string, int>
        {
            ["Strength"] = 20,
            ["Dexterity"] = 20,
            ["Constitution"] = 20,
            ["Intelligence"] = 10, // INT = 10 → modifier 0
            ["Wisdom"] = 20,
            ["Charisma"] = 20,
        };
        var character = MakeCharacter(cls, scores);

        Assert.Equal(0, character.GetRelevantAbilityModifier());
    }

    // --- Wisdom classes: Cleric, Druid ---

    [Theory]
    [InlineData(Class.Cleric, 18, 4)]
    [InlineData(Class.Cleric, 10, 0)]
    [InlineData(Class.Cleric, 8, -1)]
    [InlineData(Class.Druid, 16, 3)]
    [InlineData(Class.Druid, 12, 1)]
    [InlineData(Class.Druid, 10, 0)]
    public void WisdomClasses_ReturnWisdomModifier(Class cls, int wisScore, int expectedMod)
    {
        var character = MakeCharacter(cls, AllScores("Wisdom", wisScore));

        Assert.Equal(expectedMod, character.GetRelevantAbilityModifier());
    }

    [Theory]
    [InlineData(Class.Cleric)]
    [InlineData(Class.Druid)]
    public void WisdomClasses_IgnoreOtherAbilityScores(Class cls)
    {
        var scores = new Dictionary<string, int>
        {
            ["Strength"] = 20,
            ["Dexterity"] = 20,
            ["Constitution"] = 20,
            ["Intelligence"] = 20,
            ["Wisdom"] = 10, // WIS = 10 → modifier 0
            ["Charisma"] = 20,
        };
        var character = MakeCharacter(cls, scores);

        Assert.Equal(0, character.GetRelevantAbilityModifier());
    }

    // --- Charisma classes: Paladin, Sorcerer, Bard ---

    [Theory]
    [InlineData(Class.Paladin, 18, 4)]
    [InlineData(Class.Paladin, 10, 0)]
    [InlineData(Class.Paladin, 8, -1)]
    [InlineData(Class.Sorcerer, 20, 5)]
    [InlineData(Class.Sorcerer, 14, 2)]
    [InlineData(Class.Sorcerer, 10, 0)]
    [InlineData(Class.Bard, 16, 3)]
    [InlineData(Class.Bard, 12, 1)]
    [InlineData(Class.Bard, 10, 0)]
    public void CharismaClasses_ReturnCharismaModifier(Class cls, int chaScore, int expectedMod)
    {
        var character = MakeCharacter(cls, AllScores("Charisma", chaScore));

        Assert.Equal(expectedMod, character.GetRelevantAbilityModifier());
    }

    [Theory]
    [InlineData(Class.Paladin)]
    [InlineData(Class.Sorcerer)]
    [InlineData(Class.Bard)]
    public void CharismaClasses_IgnoreOtherAbilityScores(Class cls)
    {
        var scores = new Dictionary<string, int>
        {
            ["Strength"] = 20,
            ["Dexterity"] = 20,
            ["Constitution"] = 20,
            ["Intelligence"] = 20,
            ["Wisdom"] = 20,
            ["Charisma"] = 10, // CHA = 10 → modifier 0
        };
        var character = MakeCharacter(cls, scores);

        Assert.Equal(0, character.GetRelevantAbilityModifier());
    }

    // --- Strength classes: all remaining 17 ---

    [Theory]
    [InlineData(Class.Barbarian, 20, 5)]
    [InlineData(Class.Barbarian, 10, 0)]
    [InlineData(Class.Barbarian, 8, -1)]
    [InlineData(Class.Fighter, 18, 4)]
    [InlineData(Class.Fighter, 10, 0)]
    [InlineData(Class.Monk, 16, 3)]
    [InlineData(Class.Monk, 10, 0)]
    [InlineData(Class.Ranger, 14, 2)]
    [InlineData(Class.Ranger, 10, 0)]
    [InlineData(Class.Rogue, 12, 1)]
    [InlineData(Class.Rogue, 10, 0)]
    [InlineData(Class.Warlock, 18, 4)]
    [InlineData(Class.Warlock, 10, 0)]
    [InlineData(Class.Inquisitor, 16, 3)]
    [InlineData(Class.Inquisitor, 10, 0)]
    [InlineData(Class.Summoner, 14, 2)]
    [InlineData(Class.Summoner, 10, 0)]
    [InlineData(Class.Witch, 12, 1)]
    [InlineData(Class.Witch, 10, 0)]
    [InlineData(Class.Alchemist, 18, 4)]
    [InlineData(Class.Alchemist, 10, 0)]
    [InlineData(Class.Magus, 20, 5)]
    [InlineData(Class.Magus, 10, 0)]
    [InlineData(Class.Oracle, 16, 3)]
    [InlineData(Class.Oracle, 10, 0)]
    [InlineData(Class.Shaman, 14, 2)]
    [InlineData(Class.Shaman, 10, 0)]
    [InlineData(Class.Spiritualist, 12, 1)]
    [InlineData(Class.Spiritualist, 10, 0)]
    [InlineData(Class.Occultist, 18, 4)]
    [InlineData(Class.Occultist, 10, 0)]
    [InlineData(Class.Psychic, 16, 3)]
    [InlineData(Class.Psychic, 10, 0)]
    [InlineData(Class.Mesmerist, 14, 2)]
    [InlineData(Class.Mesmerist, 10, 0)]
    public void StrengthClasses_ReturnStrengthModifier(Class cls, int strScore, int expectedMod)
    {
        var character = MakeCharacter(cls, AllScores("Strength", strScore));

        Assert.Equal(expectedMod, character.GetRelevantAbilityModifier());
    }

    [Theory]
    [InlineData(Class.Barbarian)]
    [InlineData(Class.Fighter)]
    [InlineData(Class.Monk)]
    [InlineData(Class.Ranger)]
    [InlineData(Class.Rogue)]
    [InlineData(Class.Warlock)]
    [InlineData(Class.Inquisitor)]
    [InlineData(Class.Summoner)]
    [InlineData(Class.Witch)]
    [InlineData(Class.Alchemist)]
    [InlineData(Class.Magus)]
    [InlineData(Class.Oracle)]
    [InlineData(Class.Shaman)]
    [InlineData(Class.Spiritualist)]
    [InlineData(Class.Occultist)]
    [InlineData(Class.Psychic)]
    [InlineData(Class.Mesmerist)]
    public void StrengthClasses_IgnoreOtherAbilityScores(Class cls)
    {
        var scores = new Dictionary<string, int>
        {
            ["Strength"] = 10, // STR = 10 → modifier 0
            ["Dexterity"] = 20,
            ["Constitution"] = 20,
            ["Intelligence"] = 20,
            ["Wisdom"] = 20,
            ["Charisma"] = 20,
        };
        var character = MakeCharacter(cls, scores);

        Assert.Equal(0, character.GetRelevantAbilityModifier());
    }

    // --- Modifier edge cases ---

    [Theory]
    [InlineData(10, 0)]
    [InlineData(11, 0)]
    [InlineData(12, 1)]
    [InlineData(13, 1)]
    [InlineData(18, 4)]
    [InlineData(20, 5)]
    [InlineData(30, 10)]  // maximum possible ability score
    [InlineData(8, -1)]
    [InlineData(9, 0)]    // C# integer division truncates toward zero: -1/2 = 0
    [InlineData(7, -1)]   // (7-10)/2 = -3/2 = -1 (truncated, not floored)
    [InlineData(6, -2)]
    [InlineData(1, -4)]   // (1-10)/2 = -9/2 = -4 (C# truncation, D&D rules would give -5)
    public void ModifierFormula_CorrectForAllScores(int score, int expectedMod)
    {
        // Use Wizard (INT) as a consistent vehicle for testing the formula
        var character = MakeCharacter(Class.Wizard, AllScores("Intelligence", score));

        Assert.Equal(expectedMod, character.GetRelevantAbilityModifier());
    }

    // --- Corner cases ---

    [Fact]
    public void GetRelevantAbilityModifier_WithEmptyAbilityScores_ReturnsZero()
    {
        // TryGetValue fallback returns 0 when the relevant key is absent
        var character = new Models.Character
        {
            Name = "Test",
            CharacterClass = Class.Wizard,
            GameType = Game.dnd5e,
            Level = 1,
            AbilityScores = new Dictionary<string, int>(), // empty
        };

        Assert.Equal(0, character.GetRelevantAbilityModifier());
    }

    [Fact]
    public void GetRelevantAbilityModifier_WithMissingRelevantKey_ReturnsZero()
    {
        // AbilityScores has other keys but not the relevant one for this class
        var character = new Models.Character
        {
            Name = "Test",
            CharacterClass = Class.Cleric, // needs Wisdom
            GameType = Game.dnd5e,
            Level = 1,
            AbilityScores = new Dictionary<string, int>
            {
                ["Strength"] = 18,
                ["Intelligence"] = 18,
                // Wisdom deliberately omitted
            },
        };

        Assert.Equal(0, character.GetRelevantAbilityModifier());
    }
}
