using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class CharacterFeatEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }
    public string? FeatIndex { get; set; }
    public string? Notes { get; set; }
    public int? TakenAtLevel { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsCustom { get; set; } = false;
    public string? CustomName { get; set; }
    public string? CustomDescription { get; set; }
    public string? CustomModifiers { get; set; }  // JSON: [{type, value}]

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
}
