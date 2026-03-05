namespace TabletopSpells.Api.DTOs;

public class PreparedSpellDto
{
    public Guid Id { get; set; }
    public string SpellId { get; set; } = "";
    public bool IsPrepared { get; set; }
    public bool IsAlwaysPrepared { get; set; }
    public bool IsFavorite { get; set; }
    public bool IsDomainSpell { get; set; }
}

public class UpsertPreparedSpellRequest
{
    public required string SpellId { get; set; }
    public bool IsPrepared { get; set; }
    public bool IsAlwaysPrepared { get; set; }
    public bool IsFavorite { get; set; }
    public bool IsDomainSpell { get; set; }
}

public class SpellsPerDayDto
{
    public Guid Id { get; set; }
    public int SpellLevel { get; set; }
    public int MaxSlots { get; set; }
    public int UsedSlots { get; set; }
    public DateOnly Date { get; set; }
}

public class UpsertSpellsPerDayRequest
{
    public int SpellLevel { get; set; }
    public int MaxSlots { get; set; }
    public int UsedSlots { get; set; }
}

public class SpellCastLogDto
{
    public Guid Id { get; set; }
    public string? SpellName { get; set; }
    public int SpellLevel { get; set; }
    public DateTime CastTime { get; set; }
    public bool CastAsRitual { get; set; }
    public bool Success { get; set; }
    public string? Reason { get; set; }
    public string? FailedReason { get; set; }
    public int SessionId { get; set; }
}

public class CreateSpellCastLogRequest
{
    public required string SpellName { get; set; }
    public int SpellLevel { get; set; }
    public bool CastAsRitual { get; set; }
    public bool Success { get; set; }
    public string? Reason { get; set; }
    public string? FailedReason { get; set; }
    public int SessionId { get; set; }
}

public class CharacterThemeDto
{
    public Guid Id { get; set; }
    public string ThemeName { get; set; } = "";
    public Dictionary<string, string> CustomColors { get; set; } = new();
}

public class UpsertThemeRequest
{
    public required string ThemeName { get; set; }
    public Dictionary<string, string>? CustomColors { get; set; }
}
