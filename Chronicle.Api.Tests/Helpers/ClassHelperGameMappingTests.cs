using Chronicle.Api.Helpers;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Tests.Helpers;

/// <summary>
/// Tests ClassHelper.GetClassesByGame() for correct class-to-game mapping.
/// D&D 5e has 13 classes; Pathfinder 1e has all 24.
/// </summary>
public class ClassHelperGameMappingTests
{
    private static readonly Class[] Dnd5eClasses =
    [
        Class.Barbarian, Class.Bard, Class.Cleric, Class.Druid, Class.Fighter,
        Class.Monk, Class.Paladin, Class.Ranger, Class.Rogue, Class.Sorcerer,
        Class.Wizard, Class.Warlock, Class.Artificer,
    ];

    private static readonly Class[] PathfinderOnlyClasses =
    [
        Class.Inquisitor, Class.Summoner, Class.Witch, Class.Alchemist, Class.Magus,
        Class.Oracle, Class.Shaman, Class.Spiritualist, Class.Occultist, Class.Psychic,
        Class.Mesmerist,
    ];

    // --- D&D 5e ---

    [Fact]
    public void GetClassesByGame_Dnd5e_Returns13Classes()
    {
        var result = ClassHelper.GetClassesByGame(Game.dnd5e).ToList();

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

    [Theory]
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
    public void GetClassesByGame_Dnd5e_DoesNotContainPathfinderOnlyClass(Class cls)
    {
        var result = ClassHelper.GetClassesByGame(Game.dnd5e);

        Assert.DoesNotContain(cls, result);
    }

    // --- Pathfinder 1e ---

    [Fact]
    public void GetClassesByGame_Pathfinder1e_Returns24Classes()
    {
        var result = ClassHelper.GetClassesByGame(Game.pathfinder1e).ToList();

        Assert.Equal(24, result.Count);
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
    public void GetClassesByGame_Pathfinder1e_ContainsAllClasses(Class cls)
    {
        var result = ClassHelper.GetClassesByGame(Game.pathfinder1e);

        Assert.Contains(cls, result);
    }

    // --- Cross-game: shared classes appear in both ---

    [Theory]
    [InlineData(Class.Barbarian)]
    [InlineData(Class.Cleric)]
    [InlineData(Class.Druid)]
    [InlineData(Class.Wizard)]
    [InlineData(Class.Warlock)]
    public void SharedClasses_AppearInBothGames(Class cls)
    {
        var dnd5e = ClassHelper.GetClassesByGame(Game.dnd5e);
        var pf1e = ClassHelper.GetClassesByGame(Game.pathfinder1e);

        Assert.Contains(cls, dnd5e);
        Assert.Contains(cls, pf1e);
    }

    [Fact]
    public void Dnd5eClasses_AreProperSubsetOfPathfinder1eClasses()
    {
        var dnd5e = ClassHelper.GetClassesByGame(Game.dnd5e).ToHashSet();
        var pf1e = ClassHelper.GetClassesByGame(Game.pathfinder1e).ToHashSet();

        Assert.True(dnd5e.IsSubsetOf(pf1e));
    }
}
