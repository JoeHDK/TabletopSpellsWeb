using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class EquipmentAbilityUsageEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();

    [Required] public Guid InventoryItemId { get; set; }

    [Required, MaxLength(100)] public required string AbilityName { get; set; }

    [MaxLength(100)] public string? SpellIndex { get; set; }

    public int MaxUses { get; set; }

    public int UsesRemaining { get; set; }

    /// <summary>"short_rest" | "long_rest"</summary>
    [Required, MaxLength(20)] public required string ResetOn { get; set; }

    [ForeignKey(nameof(InventoryItemId))]
    public CharacterInventoryItemEntity? InventoryItem { get; set; }
}
