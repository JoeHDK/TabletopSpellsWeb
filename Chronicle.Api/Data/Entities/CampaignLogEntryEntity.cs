using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class CampaignLogEntryEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid GameRoomId { get; set; }
    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }

    [Required] public required string AuthorUserId { get; set; }
    [ForeignKey(nameof(AuthorUserId))] public AppUser? Author { get; set; }

    [Required, MaxLength(100)] public required string AuthorUsername { get; set; }

    [MaxLength(50_000)] public string Content { get; set; } = "";

    [MaxLength(200)] public string? Title { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
