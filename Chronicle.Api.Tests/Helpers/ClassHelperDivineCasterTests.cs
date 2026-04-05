using Chronicle.Api.Helpers;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Tests.Helpers;

/// <summary>
/// Tests ClassHelper.IsDivineCaster() directly for all D&D 5e classes.
/// </summary>
public class ClassHelperDivineCasterTests
{
    [Theory]
    [InlineData(Class.Cleric)]
    [InlineData(Class.Druid)]
    [InlineData(Class.Paladin)]
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
    public void IsDivineCaster_ReturnsFalse_ForNonDivineClasses(Class cls)
    {
        Assert.False(ClassHelper.IsDivineCaster(cls));
    }

    [Fact]
    public void DivineCasters_ArrayContainsExactlyThreeClasses()
    {
        Assert.Equal(3, ClassHelper.DivineCasters.Length);
    }

    [Fact]
    public void DivineCasters_ContainsExpectedThreeClasses()
    {
        var expected = new[] { Class.Cleric, Class.Druid, Class.Paladin };
        Assert.Equal(expected.OrderBy(c => c.ToString()), ClassHelper.DivineCasters.OrderBy(c => c.ToString()));
    }
}
