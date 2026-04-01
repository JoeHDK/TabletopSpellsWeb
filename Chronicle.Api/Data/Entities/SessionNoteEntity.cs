using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class SessionNoteEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid GameRoomId { get; set; }
    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }

    [Required, MaxLength(200)] public required string Title { get; set; }
    public string Content { get; set; } = "";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
