using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Data.Entities;

public class GameMemberEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid GameRoomId { get; set; }
    [Required] public required string UserId { get; set; }
    public GameRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }
    [ForeignKey(nameof(UserId))] public AppUser? User { get; set; }
}
