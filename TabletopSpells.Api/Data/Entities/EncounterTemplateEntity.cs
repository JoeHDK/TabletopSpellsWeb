using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class EncounterTemplateEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid GameRoomId { get; set; }
    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }

    [Required, MaxLength(200)] public required string Name { get; set; }
    public Guid? SessionNoteId { get; set; }
    [ForeignKey(nameof(SessionNoteId))] public SessionNoteEntity? Session { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<EncounterTemplateCreatureEntity> Creatures { get; set; } = new List<EncounterTemplateCreatureEntity>();
}
