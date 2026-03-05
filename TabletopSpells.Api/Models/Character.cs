using TabletopSpells.Api.Helpers;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.Models;

public class Character
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }

    private Class _characterClass;
    public Class CharacterClass
    {
        get => _characterClass;
        set
        {
            _characterClass = value;
            IsDivineCaster = ClassHelper.IsDivineCaster(value);
        }
    }

    public Subclass Subclass { get; set; } = Subclass.None;
    public Game GameType { get; init; }
    public int Level { get; set; }
    public bool IsDivineCaster { get; set; }

    public Dictionary<int, int> MaxSpellsPerDay { get; set; } = new();
    public Dictionary<int, int> SpellsUsedToday { get; set; } = new();
    public List<string> AlwaysPreparedSpells { get; init; } = new();

    public Dictionary<string, int> AbilityScores { get; set; } = new()
    {
        ["Strength"] = 10,
        ["Dexterity"] = 10,
        ["Constitution"] = 10,
        ["Intelligence"] = 10,
        ["Wisdom"] = 10,
        ["Charisma"] = 10
    };

    private Dictionary<string, int> AbilityModifiers =>
        AbilityScores.ToDictionary(kvp => kvp.Key, kvp => (kvp.Value - 10) / 2);

    public int GetRelevantAbilityModifier()
    {
        string relevant = CharacterClass switch
        {
            Class.Wizard or Class.Artificer => "Intelligence",
            Class.Cleric or Class.Druid => "Wisdom",
            Class.Paladin or Class.Sorcerer or Class.Bard => "Charisma",
            _ => "Strength"
        };
        return AbilityModifiers.TryGetValue(relevant, out var mod) ? mod : 0;
    }

    public bool CastSpell(int spellLevel)
    {
        if (spellLevel is 0 or -1) return true;
        if (!SpellsUsedToday.TryGetValue(spellLevel, out var used) ||
            !MaxSpellsPerDay.TryGetValue(spellLevel, out var max) || used >= max)
            return false;
        SpellsUsedToday[spellLevel]++;
        return true;
    }
}
