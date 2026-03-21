using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class SpellCastLogEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }
    public string? SpellName { get; set; }
    public int SpellLevel { get; set; }
    public DateTime CastTime { get; set; } = DateTime.UtcNow;
    public bool CastAsRitual { get; set; }
    public bool Success { get; set; }
    public string? Reason { get; set; }
    public string? FailedReason { get; set; }
    public int SessionId { get; set; }

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
}
