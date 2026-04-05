using Chronicle.Api.Models.Enums;
using Chronicle.Api.Services;

namespace Chronicle.Api.Tests.Services;

/// <summary>
/// Tests SpellService file-based loading, level filtering, and search.
/// JSON files are linked from the API project into the test output directory.
/// </summary>
public class SpellServiceTests : IDisposable
{
    private readonly SpellService _service = new();

    // SpellService uses a static cache; clear it between test runs by reflection
    // to avoid cross-test contamination when running the full suite.
    public void Dispose()
    {
        var cacheField = typeof(SpellService)
            .GetField("_cache", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        (cacheField?.GetValue(null) as System.Collections.IDictionary)?.Clear();
    }

    // --- Spell loading ---

    [Fact]
    public void GetSpells_Dnd5e_ReturnsNonEmptyList()
    {
        var spells = _service.GetSpells(Game.dnd5e);

        Assert.NotEmpty(spells);
    }

    [Fact]
    public void GetSpells_Custom_ReturnsEmptyList()
    {
        var spells = _service.GetSpells(Game.custom);

        Assert.Empty(spells);
    }

    [Fact]
    public void GetSpells_CalledTwice_ReturnsSameList_Cached()
    {
        var first = _service.GetSpells(Game.dnd5e);
        var second = _service.GetSpells(Game.dnd5e);

        Assert.Same(first, second);
    }

    // --- Level filtering ---

    [Theory]
    [InlineData(Game.dnd5e, 0)]
    [InlineData(Game.dnd5e, 1)]
    [InlineData(Game.dnd5e, 3)]
    [InlineData(Game.dnd5e, 9)]
    public void GetSpellsByLevel_ReturnsNonEmptyList(Game game, int level)
    {
        var spells = _service.GetSpellsByLevel(game, level);

        Assert.NotEmpty(spells);
    }

    [Fact]
    public void GetSpellsByLevel_Dnd5e_Level0_ReturnsOnlyZeroLevelSpells()
    {
        // D&D 5e cantrips have SpellLevel like "wizard 0, sorcerer 0" (no word "cantrip")
        // ParseLevel extracts the digit(s) — "wizard 0, sorcerer 0" → ParseLevel returns 0
        var level0Spells = _service.GetSpellsByLevel(Game.dnd5e, 0);

        // Spells returned for level 0 should not contain any "1st" or higher level markers
        Assert.NotEmpty(level0Spells);
        Assert.All(level0Spells, s =>
            Assert.False(
                s.SpellLevel != null && (
                    s.SpellLevel.Contains(" 1") || s.SpellLevel.Contains(" 2") ||
                    s.SpellLevel.Contains(" 3") || s.SpellLevel.Contains(" 4") ||
                    s.SpellLevel.Contains(" 5") || s.SpellLevel.Contains(" 6") ||
                    s.SpellLevel.Contains(" 7") || s.SpellLevel.Contains(" 8") ||
                    s.SpellLevel.Contains(" 9")),
                $"Level-0 bucket returned a leveled spell: {s.SpellLevel}"));
    }

    [Fact]
    public void GetSpellsByLevel_Dnd5e_LevelsAreMutuallyExclusive()
    {
        var level1 = _service.GetSpellsByLevel(Game.dnd5e, 1).Select(s => s.Name).ToHashSet();
        var level2 = _service.GetSpellsByLevel(Game.dnd5e, 2).Select(s => s.Name).ToHashSet();

        Assert.Empty(level1.Intersect(level2));
    }

    // --- Search ---

    [Fact]
    public void SearchSpells_Dnd5e_ReturnsMatchingSpells()
    {
        var results = _service.SearchSpells(Game.dnd5e, "fire");

        Assert.NotEmpty(results);
        Assert.All(results, s => Assert.Contains("fire", s.Name, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void SearchSpells_IsCaseInsensitive_LowerQuery()
    {
        var lower = _service.SearchSpells(Game.dnd5e, "fireball");
        var upper = _service.SearchSpells(Game.dnd5e, "FIREBALL");
        var mixed = _service.SearchSpells(Game.dnd5e, "Fireball");

        Assert.Equal(lower.Count, upper.Count);
        Assert.Equal(lower.Count, mixed.Count);
    }

    [Fact]
    public void SearchSpells_WithNoMatch_ReturnsEmptyList()
    {
        var results = _service.SearchSpells(Game.dnd5e, "xyzzyxyzzy_nosuchthing");

        Assert.Empty(results);
    }

    [Fact]
    public void GetSpells_AllSpells_HaveNonNullName()
    {
        var spells = _service.GetSpells(Game.dnd5e);

        Assert.All(spells, s => Assert.NotNull(s.Name));
    }

    // --- Corner cases ---

    [Fact]
    public void GetSpellsByLevel_LevelTen_ReturnsEmptyList_NoException()
    {
        // Level 10 spells don't exist — should return empty gracefully
        var result = _service.GetSpellsByLevel(Game.dnd5e, 10);

        Assert.Empty(result);
    }

    [Fact]
    public void SearchSpells_EmptyString_ReturnsAllSpells()
    {
        // Every spell name contains "" so all spells match
        var all = _service.GetSpells(Game.dnd5e);
        var searched = _service.SearchSpells(Game.dnd5e, "");

        Assert.Equal(all.Count, searched.Count);
    }
}
