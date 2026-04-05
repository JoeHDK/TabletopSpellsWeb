using Chronicle.Api.Helpers;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Tests.Helpers;

/// <summary>
/// Tests ClassHelper.GetClassesByGame() — now always returns all 13 D&D 5e classes.
/// </summary>
public class ClassHelperGameMappingTests
{
    private static readonly Class[] AllClasses =
    [
        Class.Barbarian, Class.Bard, Class.Cleric, Class.Druid, Class.Fighter,
        Class.Monk, Class.Paladin, Class.Ranger, Class.Rogue, Class.Sorcerer,
        Class.Wizard, Class.Warlock, Class.Artificer,
    ];

    [Fact]
    public void GetClassesByGame_Dnd5e_Returns13Classes()
    {
        var result = ClassHelper.GetClassesByGame(Game.dnd5e).ToList();

        Assert.Equal(13, result.Count);
    }

    [Fact]
    public void GetClassesByGame_Custom_Returns13Classes()
    {
        var result = ClassHelper.GetClassesByGame(Game.custom).ToList();

        Assert.Equal(13, result.Count);
    }

    [Theory]
    [InlineData(Class.Barbarian)]
    [InlineData(Class.Bard)]
    [InlineData(Class.Cleric)]
    [InlineData(Class.Druid)]
    [InlineData(Class.Fighter)]
    [InlineData(Class.Monk)]
    [InlineData(Class.Paladin)]
    [InlineData(Class.Ranger)]
    [InlineData(Class.Rogue)]
    [InlineData(Class.Sorcerer)]
    [InlineData(Class.Wizard)]
    [InlineData(Class.Warlock)]
    [InlineData(Class.Artificer)]
    public void GetClassesByGame_Dnd5e_ContainsExpectedClass(Class cls)
    {
        var result = ClassHelper.GetClassesByGame(Game.dnd5e);

        Assert.Contains(cls, result);
    }

    [Fact]
    public void AllClasses_ContainsAllExpectedClasses()
    {
        foreach (var cls in AllClasses)
            Assert.Contains(cls, ClassHelper.AllClasses);
    }
}
