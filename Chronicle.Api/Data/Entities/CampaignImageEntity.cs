using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class CampaignImageEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid GameRoomId { get; set; }
    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }

    [Required] public required string UploaderUserId { get; set; }
    [ForeignKey(nameof(UploaderUserId))] public AppUser? Uploader { get; set; }

    [Required, MaxLength(200)] public required string FileName { get; set; }
    [Required, MaxLength(50)] public required string ContentType { get; set; }
    [Required, MaxLength(500)] public required string StoragePath { get; set; }

    public long FileSizeBytes { get; set; }

    [MaxLength(200)] public string? Caption { get; set; }

    /// <summary>
    /// null = published to all members; non-null JSON array of userId strings = published to specific users
    /// </summary>
    public string? PublishedToUserIdsJson { get; set; }

    /// <summary>
    /// Whether the image is visible to players at all (DM can unpublish)
    /// </summary>
    public bool IsPublished { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
