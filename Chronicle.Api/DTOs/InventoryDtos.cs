using System.ComponentModel.DataAnnotations;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.Models;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.DTOs;

public class InventoryItemDto
{
    public Guid Id { get; set; }
    public string ItemSource { get; set; } = "";
    public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
    public bool IsEquipped { get; set; }
    public string? EquippedSlot { get; set; }
    public int? AcBonus { get; set; }
    public string? ArmorType { get; set; }
    public string? DamageOverride { get; set; }
    public List<DamageEntryDto>? DamageEntries { get; set; }
    public bool IsTwoHanded { get; set; }
    public int? StrBonus { get; set; }
    public int? ConBonus { get; set; }
    public int? DexBonus { get; set; }
    public int? WisBonus { get; set; }
    public int? IntBonus { get; set; }
    public int? ChaBonus { get; set; }
    public int? SavingThrowBonus { get; set; }
    public string? Notes { get; set; }
    public string? GrantedByUsername { get; set; }
    public DateTime AcquiredAt { get; set; }
}

public class AddInventoryItemRequest
{
    public ItemSource ItemSource { get; set; }
    [StringLength(100)]
    public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }
    [Range(1, 9999)]
    public int Quantity { get; set; } = 1;
    public int? AcBonus { get; set; }
    public ArmorType? ArmorType { get; set; }
    [StringLength(50)]
    public string? DamageOverride { get; set; }
    public List<DamageEntryDto>? DamageEntries { get; set; }
    public bool IsTwoHanded { get; set; }
    public int? StrBonus { get; set; }
    public int? ConBonus { get; set; }
    public int? DexBonus { get; set; }
    public int? WisBonus { get; set; }
    public int? IntBonus { get; set; }
    public int? ChaBonus { get; set; }
    public int? SavingThrowBonus { get; set; }
    [StringLength(500)]
    public string? Notes { get; set; }
}

public class EquipItemRequest
{
    public bool IsEquipped { get; set; }
    public InventorySlot? Slot { get; set; }
    public ArmorType? ArmorType { get; set; }
    public int? AcBonus { get; set; }
    public bool IsTwoHanded { get; set; }
}
