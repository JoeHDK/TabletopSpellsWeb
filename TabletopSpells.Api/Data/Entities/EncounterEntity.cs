using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class EncounterEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid GameRoomId { get; set; }
    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }

    [MaxLength(200)] public string? Name { get; set; }
    public bool IsActive { get; set; } = true;
    public int RoundNumber { get; set; } = 1;
    public int ActiveCreatureIndex { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<EncounterCreatureEntity> Creatures { get; set; } = new List<EncounterCreatureEntity>();
}
