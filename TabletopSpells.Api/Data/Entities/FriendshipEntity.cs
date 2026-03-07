using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public enum FriendshipStatus
{
    Pending,
    Accepted,
    Blocked,
}

public class FriendshipEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The user who sent the friend request.</summary>
    [Required] public required string RequesterId { get; set; }

    /// <summary>The user who received the friend request.</summary>
    [Required] public required string AddresseeId { get; set; }

    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(RequesterId))] public AppUser? Requester { get; set; }
    [ForeignKey(nameof(AddresseeId))] public AppUser? Addressee { get; set; }
}
