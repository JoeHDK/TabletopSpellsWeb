using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public enum InventorySlot { Armor, Weapon, Offhand, Accessory }
public enum ItemSource { SRD, Custom }

public class CharacterInventoryItemEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }

    public ItemSource ItemSource { get; set; }
    public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }

    [Required] public required string Name { get; set; }
    public int Quantity { get; set; } = 1;
    public bool IsEquipped { get; set; }
    public InventorySlot? EquippedSlot { get; set; }
    public int? AcBonus { get; set; }
    public string? DamageOverride { get; set; }
    public string? Notes { get; set; }
    public string? GrantedByUserId { get; set; }
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
    [ForeignKey(nameof(CustomItemId))] public CustomItemEntity? CustomItem { get; set; }
    [ForeignKey(nameof(GrantedByUserId))] public AppUser? GrantedBy { get; set; }
}
