namespace Chronicle.Api.DTOs;

public class EquipmentResourceDto
{
    public Guid Id { get; set; }
    public Guid InventoryItemId { get; set; }
    public string ItemName { get; set; } = "";
    public string AbilityName { get; set; } = "";
    public string? SpellIndex { get; set; }
    public int MaxUses { get; set; }
    public int UsesRemaining { get; set; }
    public string ResetOn { get; set; } = "long_rest";
}
