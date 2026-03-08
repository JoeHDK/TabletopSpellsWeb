using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class CharacterFeatEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }
    [Required] public required string FeatIndex { get; set; }
    public string? Notes { get; set; }
    public int? TakenAtLevel { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
}
