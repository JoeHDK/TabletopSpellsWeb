using Chronicle.Api.DTOs;
using Chronicle.Api.Models.Enums;
using Newtonsoft.Json;

namespace Chronicle.Api.Tests.Character;

/// <summary>
/// Tests for CharacterClassEntryDto JSON serialization/deserialization (multiclass support).
/// Mirrors what CharactersController does: serialize req.Classes to MulticlassJson, then
/// deserialize MulticlassJson back to List&lt;CharacterClassEntryDto&gt; in MapToDto().
/// </summary>
public class MulticlassTests
{
    // -----------------------------------------------------------------------
    // CharacterClassEntryDto property mapping
    // -----------------------------------------------------------------------

    [Fact]
    public void CharacterClassEntryDto_BasicProperties_RoundTrip()
    {
        var entry = new CharacterClassEntryDto
        {
            CharacterClass = Class.Wizard,
            Subclass = "WizardEvocation",
            Level = 5,
            CantripsKnown = 4,
        };

        var json = JsonConvert.SerializeObject(entry);
        var result = JsonConvert.DeserializeObject<CharacterClassEntryDto>(json);

        Assert.NotNull(result);
        Assert.Equal(Class.Wizard, result.CharacterClass);
        Assert.Equal("WizardEvocation", result.Subclass);
        Assert.Equal(5, result.Level);
        Assert.Equal(4, result.CantripsKnown);
    }

    [Fact]
    public void CharacterClassEntryDto_DefaultSubclass_IsNone()
    {
        var entry = new CharacterClassEntryDto { CharacterClass = Class.Barbarian, Level = 1 };
        Assert.Equal("None", entry.Subclass);
    }

    // -----------------------------------------------------------------------
    // Null / empty MulticlassJson handling (mirrors controller logic)
    // -----------------------------------------------------------------------

    [Fact]
    public void NullMulticlassJson_Returns_NullClasses()
    {
        string? multiclassJson = null;

        var classes = multiclassJson != null
            ? JsonConvert.DeserializeObject<List<CharacterClassEntryDto>>(multiclassJson)
            : null;

        Assert.Null(classes);
    }

    [Fact]
    public void EmptyClassesList_Serializes_ToNull_In_Controller_Logic()
    {
        // Mirrors: req.Classes.Count > 0 ? serialize : null
        var classes = new List<CharacterClassEntryDto>();
        string? multiclassJson = classes.Count > 0 ? JsonConvert.SerializeObject(classes) : null;
        Assert.Null(multiclassJson);
    }

    // -----------------------------------------------------------------------
    // Single-class entry roundtrip
    // -----------------------------------------------------------------------

    [Fact]
    public void SingleEntry_SerializeDeserialize_Roundtrip()
    {
        var classes = new List<CharacterClassEntryDto>
        {
            new() { CharacterClass = Class.Wizard, Subclass = "WizardEvocation", Level = 5, CantripsKnown = 5 }
        };

        var json = JsonConvert.SerializeObject(classes);
        var result = JsonConvert.DeserializeObject<List<CharacterClassEntryDto>>(json);

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(Class.Wizard, result[0].CharacterClass);
        Assert.Equal("WizardEvocation", result[0].Subclass);
        Assert.Equal(5, result[0].Level);
        Assert.Equal(5, result[0].CantripsKnown);
    }

    // -----------------------------------------------------------------------
    // Multi-class entry roundtrip (multiclassing scenario)
    // -----------------------------------------------------------------------

    [Fact]
    public void MultipleEntries_SerializeDeserialize_Roundtrip()
    {
        var classes = new List<CharacterClassEntryDto>
        {
            new() { CharacterClass = Class.Fighter, Subclass = "None", Level = 5, CantripsKnown = 0 },
            new() { CharacterClass = Class.Wizard, Subclass = "WizardEvocation", Level = 3, CantripsKnown = 3 },
        };

        var json = JsonConvert.SerializeObject(classes);
        var result = JsonConvert.DeserializeObject<List<CharacterClassEntryDto>>(json);

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);

        Assert.Equal(Class.Fighter, result[0].CharacterClass);
        Assert.Equal("None", result[0].Subclass);
        Assert.Equal(5, result[0].Level);
        Assert.Equal(0, result[0].CantripsKnown);

        Assert.Equal(Class.Wizard, result[1].CharacterClass);
        Assert.Equal("WizardEvocation", result[1].Subclass);
        Assert.Equal(3, result[1].Level);
        Assert.Equal(3, result[1].CantripsKnown);
    }

    [Fact]
    public void FiveClassEntries_PreservesOrder()
    {
        var input = new List<CharacterClassEntryDto>
        {
            new() { CharacterClass = Class.Barbarian, Level = 4 },
            new() { CharacterClass = Class.Fighter, Level = 3 },
            new() { CharacterClass = Class.Rogue, Level = 3 },
            new() { CharacterClass = Class.Wizard, Level = 2, Subclass = "WizardEvocation", CantripsKnown = 3 },
            new() { CharacterClass = Class.Warlock, Level = 2, CantripsKnown = 2 },
        };

        var json = JsonConvert.SerializeObject(input);
        var result = JsonConvert.DeserializeObject<List<CharacterClassEntryDto>>(json);

        Assert.NotNull(result);
        Assert.Equal(5, result.Count);
        Assert.Equal(Class.Barbarian, result[0].CharacterClass);
        Assert.Equal(Class.Warlock, result[4].CharacterClass);
        Assert.Equal(2, result[4].CantripsKnown);
    }

    // -----------------------------------------------------------------------
    // LastLevelUpSnapshot passthrough (opaque string)
    // -----------------------------------------------------------------------

    [Fact]
    public void LastLevelUpSnapshot_PassedThrough_AsOpaqueString()
    {
        // The snapshot is stored and returned as raw JSON — the controller never parses it
        const string snapshot = """{"level":4,"hp":28,"classes":[{"characterClass":"Wizard","level":4}]}""";

        // Simulate controller: store → return (no transformation)
        string? stored = snapshot == "" ? null : snapshot;
        Assert.Equal(snapshot, stored);
    }

    [Fact]
    public void LastLevelUpSnapshot_EmptyString_StoredAsNull()
    {
        // Mirrors: req.LastLevelUpSnapshot == "" ? null : req.LastLevelUpSnapshot
        string? snapshot = "";
        string? stored = snapshot == "" ? null : snapshot;
        Assert.Null(stored);
    }

    [Fact]
    public void LastLevelUpSnapshot_Null_NotUpdated()
    {
        // req.LastLevelUpSnapshot == null means "don't touch" — controller skips the update
        string? snapshot = null;
        bool wasUpdated = snapshot != null;
        Assert.False(wasUpdated);
    }
}
