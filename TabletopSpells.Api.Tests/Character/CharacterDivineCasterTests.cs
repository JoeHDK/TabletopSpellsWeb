using TabletopSpells.Api.Models;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.Tests.Character;

/// <summary>
/// Tests that CharacterClass setter correctly auto-sets IsDivineCaster
/// for all 24 classes via ClassHelper.IsDivineCaster().
/// </summary>
public class CharacterDivineCasterTests
{
    private static Models.Character MakeCharacter(Class cls) => new()
    {
        Name = "Test",
        CharacterClass = cls,
        GameType = cls is Class.Inquisitor or Class.Summoner or Class.Witch or Class.Alchemist
            or Class.Magus or Class.Oracle or Class.Shaman or Class.Spiritualist
            or Class.Occultist or Class.Psychic or Class.Mesmerist
            ? Game.pathfinder1e
            : Game.dnd5e,
        Level = 1,
    };

    // --- Divine casters: Cleric, Druid, Paladin, Oracle, Shaman, Inquisitor ---

    [Theory]
    [InlineData(Class.Cleric)]
    [InlineData(Class.Druid)]
    [InlineData(Class.Paladin)]
    [InlineData(Class.Oracle)]
    [InlineData(Class.Shaman)]
    [InlineData(Class.Inquisitor)]
    public void DivineCasterClasses_HaveIsDivineCasterTrue(Class cls)
    {
        var character = MakeCharacter(cls);

        Assert.True(character.IsDivineCaster);
    }

    // --- Arcane / non-divine casters: all other 18 classes ---

    [Theory]
    [InlineData(Class.Barbarian)]
    [InlineData(Class.Bard)]
    [InlineData(Class.Fighter)]
    [InlineData(Class.Monk)]
    [InlineData(Class.Ranger)]
    [InlineData(Class.Rogue)]
    [InlineData(Class.Sorcerer)]
    [InlineData(Class.Wizard)]
    [InlineData(Class.Warlock)]
    [InlineData(Class.Artificer)]
    [InlineData(Class.Summoner)]
    [InlineData(Class.Witch)]
    [InlineData(Class.Alchemist)]
    [InlineData(Class.Magus)]
    [InlineData(Class.Spiritualist)]
    [InlineData(Class.Occultist)]
    [InlineData(Class.Psychic)]
    [InlineData(Class.Mesmerist)]
    public void NonDivineCasterClasses_HaveIsDivineCasterFalse(Class cls)
    {
        var character = MakeCharacter(cls);

        Assert.False(character.IsDivineCaster);
    }

    [Fact]
    public void ChangingClass_FromDivineToArcane_UpdatesIsDivineCaster()
    {
        var character = MakeCharacter(Class.Cleric);
        Assert.True(character.IsDivineCaster);

        character.CharacterClass = Class.Wizard;

        Assert.False(character.IsDivineCaster);
    }

    [Fact]
    public void ChangingClass_FromArcaneToDivine_UpdatesIsDivineCaster()
    {
        var character = MakeCharacter(Class.Wizard);
        Assert.False(character.IsDivineCaster);

        character.CharacterClass = Class.Cleric;

        Assert.True(character.IsDivineCaster);
    }

    [Fact]
    public void ChangingClass_BetweenTwoDivineClasses_RemainsTrue()
    {
        var character = MakeCharacter(Class.Cleric);

        character.CharacterClass = Class.Druid;

        Assert.True(character.IsDivineCaster);
    }

    [Fact]
    public void ChangingClass_BetweenTwoArcaneClasses_RemainsFalse()
    {
        var character = MakeCharacter(Class.Wizard);

        character.CharacterClass = Class.Sorcerer;

        Assert.False(character.IsDivineCaster);
    }

    [Fact]
    public void Barbarian_IsNotDivineCaster()
    {
        var character = MakeCharacter(Class.Barbarian);

        Assert.False(character.IsDivineCaster);
    }

    [Fact]
    public void Oracle_IsDivineCaster_EvenThoughPathfinderOnly()
    {
        var character = MakeCharacter(Class.Oracle);

        Assert.True(character.IsDivineCaster);
    }

    [Fact]
    public void Inquisitor_IsDivineCaster_EvenThoughPathfinderOnly()
    {
        var character = MakeCharacter(Class.Inquisitor);

        Assert.True(character.IsDivineCaster);
    }

    [Fact]
    public void Shaman_IsDivineCaster_EvenThoughPathfinderOnly()
    {
        var character = MakeCharacter(Class.Shaman);

        Assert.True(character.IsDivineCaster);
    }
}
