using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public enum NotificationType
{
    GameInvite,
    ItemReceived,
    ItemSent,
}

public class NotificationEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public required string UserId { get; set; }
    public NotificationType Type { get; set; }
    [Required] public required string Title { get; set; }
    [Required] public required string Message { get; set; }
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))] public AppUser? User { get; set; }
}
