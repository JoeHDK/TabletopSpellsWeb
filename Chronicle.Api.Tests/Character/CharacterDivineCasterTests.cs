using Chronicle.Api.Models;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Tests.Character;

/// <summary>
/// Tests that CharacterClass setter correctly auto-sets IsDivineCaster
/// for all D&D 5e classes via ClassHelper.IsDivineCaster().
/// </summary>
public class CharacterDivineCasterTests
{
    private static Models.Character MakeCharacter(Class cls) => new()
    {
        Name = "Test",
        CharacterClass = cls,
        GameType = Game.dnd5e,
        Level = 1,
    };

    // --- Divine casters: Cleric, Druid, Paladin ---

    [Theory]
    [InlineData(Class.Cleric)]
    [InlineData(Class.Druid)]
    [InlineData(Class.Paladin)]
    public void DivineCasterClasses_HaveIsDivineCasterTrue(Class cls)
    {
        var character = MakeCharacter(cls);

        Assert.True(character.IsDivineCaster);
    }

    // --- Non-divine casters: all other 10 classes ---

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
}
