using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.DTOs;

public class CharacterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public Class CharacterClass { get; set; }
    public Subclass Subclass { get; set; }
    public Game GameType { get; set; }
    public int Level { get; set; }
    public bool IsDivineCaster { get; set; }
    public Dictionary<string, int> AbilityScores { get; set; } = new();
    public Dictionary<int, int> MaxSpellsPerDay { get; set; } = new();
    public Dictionary<int, int> SpellsUsedToday { get; set; } = new();
    public List<string> AlwaysPreparedSpells { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateCharacterRequest
{
    public required string Name { get; set; }
    public Class CharacterClass { get; set; }
    public Subclass Subclass { get; set; } = Subclass.None;
    public Game GameType { get; set; }
    public int Level { get; set; } = 1;
    public Dictionary<string, int>? AbilityScores { get; set; }
}

public class UpdateCharacterRequest
{
    public string? Name { get; set; }
    public int? Level { get; set; }
    public Subclass? Subclass { get; set; }
    public Dictionary<string, int>? AbilityScores { get; set; }
    public Dictionary<int, int>? MaxSpellsPerDay { get; set; }
    public Dictionary<int, int>? SpellsUsedToday { get; set; }
}
