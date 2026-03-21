namespace Chronicle.Api.DTOs;

// ── Session Notes ──────────────────────────────────────────────────────────────

public class SessionNoteDto
{
    public Guid Id { get; set; }
    public Guid GameRoomId { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSessionNoteRequest
{
    public required string Title { get; set; }
    public string Content { get; set; } = "";
}

public class UpdateSessionNoteRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public int? SortOrder { get; set; }
}

// ── Encounter Templates ────────────────────────────────────────────────────────

public class EncounterTemplateCreatureDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = "";
    public string? MonsterName { get; set; }
    public int MaxHp { get; set; }
    public int ArmorClass { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
}

public class EncounterTemplateDto
{
    public Guid Id { get; set; }
    public Guid GameRoomId { get; set; }
    public string Name { get; set; } = "";
    public Guid? SessionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<EncounterTemplateCreatureDto> Creatures { get; set; } = new();
}

public class CreateEncounterTemplateRequest
{
    public required string Name { get; set; }
    public Guid? SessionId { get; set; }
}

public class UpdateEncounterTemplateRequest
{
    public required string Name { get; set; }
    public Guid? SessionId { get; set; }
    public bool UnlinkSession { get; set; }
}

public class AddTemplateCreatureRequest
{
    public required string DisplayName { get; set; }
    public string? MonsterName { get; set; }
    public int MaxHp { get; set; }
    public int ArmorClass { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTemplateCreatureRequest
{
    public required string DisplayName { get; set; }
    public int MaxHp { get; set; }
    public int ArmorClass { get; set; }
    public string? Notes { get; set; }
}
