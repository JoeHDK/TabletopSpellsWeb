using TabletopSpells.Api.Helpers;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.Tests.Helpers;

/// <summary>
/// Tests ClassHelper.IsDivineCaster() directly for all 24 classes.
/// </summary>
public class ClassHelperDivineCasterTests
{
    [Theory]
    [InlineData(Class.Cleric)]
    [InlineData(Class.Druid)]
    [InlineData(Class.Paladin)]
    [InlineData(Class.Oracle)]
    [InlineData(Class.Shaman)]
    [InlineData(Class.Inquisitor)]
    public void IsDivineCaster_ReturnsTrue_ForDivineClasses(Class cls)
    {
        Assert.True(ClassHelper.IsDivineCaster(cls));
    }

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
    public void IsDivineCaster_ReturnsFalse_ForNonDivineClasses(Class cls)
    {
        Assert.False(ClassHelper.IsDivineCaster(cls));
    }

    [Fact]
    public void DivineCasters_ArrayContainsExactlySixClasses()
    {
        Assert.Equal(6, ClassHelper.DivineCasters.Length);
    }

    [Fact]
    public void DivineCasters_ContainsExpectedSixClasses()
    {
        var expected = new[] { Class.Cleric, Class.Druid, Class.Paladin, Class.Oracle, Class.Shaman, Class.Inquisitor };
        Assert.Equal(expected.OrderBy(c => c.ToString()), ClassHelper.DivineCasters.OrderBy(c => c.ToString()));
    }
}
