using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Data.Entities;

public class GameLootItemEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid GameRoomId { get; set; }

    [Required, StringLength(100)] public required string Name { get; set; }
    public ItemSource ItemSource { get; set; }
    [StringLength(100)] public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }
    [Range(1, 9999)] public int Quantity { get; set; } = 1;
    [Range(0, 99)] public int? AcBonus { get; set; }
    public ArmorType? ArmorType { get; set; }
    [StringLength(100)] public string? DamageOverride { get; set; }
    [StringLength(500)] public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }
    [ForeignKey(nameof(CustomItemId))] public CustomItemEntity? CustomItem { get; set; }
}
