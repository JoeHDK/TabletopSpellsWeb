using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Data.Entities;

public enum InventorySlot
{
    // Legacy values kept for backwards compat (existing DB rows)
    Armor = 0,
    Weapon = 1,
    Offhand = 2,
    Accessory = 3,
    // New named slots
    Head = 4,
    Chest = 5,
    Legs = 6,
    Hands = 7,
    Feet = 8,
    MainHand = 9,
    OffHand = 10,
    Neck = 11,
    Ring1 = 12,
    Ring2 = 13,
}
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
    public ArmorType? ArmorType { get; set; }
    public string? DamageOverride { get; set; }
    public bool IsTwoHanded { get; set; }
    public string? Notes { get; set; }
    public string? GrantedByUserId { get; set; }
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
    [ForeignKey(nameof(CustomItemId))] public CustomItemEntity? CustomItem { get; set; }
    [ForeignKey(nameof(GrantedByUserId))] public AppUser? GrantedBy { get; set; }
}
