using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class ClassResourceEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }

    /// <summary>Stable key, e.g. "channel_divinity", "ki_points", "rage".</summary>
    [Required, MaxLength(64)] public string ResourceKey { get; set; } = "";

    [Required, MaxLength(100)] public string Name { get; set; } = "";

    public int MaxUses { get; set; }
    public int UsesRemaining { get; set; }

    /// <summary>"short_rest" | "long_rest" | "daily" | "weekly"</summary>
    [Required, MaxLength(20)] public string ResetOn { get; set; } = "long_rest";

    /// <summary>True for Lay on Hands — UsesRemaining tracks HP pool, not charge count.</summary>
    public bool IsHpPool { get; set; }

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
}
