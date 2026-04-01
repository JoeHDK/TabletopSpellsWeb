using System.ComponentModel.DataAnnotations;

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
    [Required, StringLength(200, MinimumLength = 1)]
    public required string Title { get; set; }
    [StringLength(50000)]
    public string Content { get; set; } = "";
}

public class UpdateSessionNoteRequest
{
    [StringLength(200, MinimumLength = 1)]
    public string? Title { get; set; }
    [StringLength(50000)]
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
    [Required, StringLength(200, MinimumLength = 1)]
    public required string Name { get; set; }
    public Guid? SessionId { get; set; }
}

public class UpdateEncounterTemplateRequest
{
    [Required, StringLength(200, MinimumLength = 1)]
    public required string Name { get; set; }
    public Guid? SessionId { get; set; }
    public bool UnlinkSession { get; set; }
}

public class AddTemplateCreatureRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string DisplayName { get; set; }
    [StringLength(100)]
    public string? MonsterName { get; set; }
    public int MaxHp { get; set; }
    public int ArmorClass { get; set; }
    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateTemplateCreatureRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string DisplayName { get; set; }
    public int MaxHp { get; set; }
    public int ArmorClass { get; set; }
    [StringLength(1000)]
    public string? Notes { get; set; }
}
