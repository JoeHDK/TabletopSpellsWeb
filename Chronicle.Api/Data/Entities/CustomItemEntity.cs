using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class CustomItemEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public required string UserId { get; set; }
    [Required] public required string Name { get; set; }
    public string ItemType { get; set; } = "magic";
    public string? Category { get; set; }
    public string? Rarity { get; set; }
    public string? Description { get; set; }
    public bool RequiresAttunement { get; set; }
    public string? AttunementNote { get; set; }
    public string? Cost { get; set; }
    public double? Weight { get; set; }
    public string? Damage { get; set; }
    [Column(TypeName = "jsonb")] public string PropertiesJson { get; set; } = "[]";
    public string? DamageEntriesJson { get; set; }
    public string? AbilitiesJson { get; set; }
    public int? AcBonus { get; set; }
    public int? StrBonus { get; set; }
    public int? ConBonus { get; set; }
    public int? DexBonus { get; set; }
    public int? WisBonus { get; set; }
    public int? IntBonus { get; set; }
    public int? ChaBonus { get; set; }
    public int? SavingThrowBonus { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))] public AppUser? User { get; set; }
}
