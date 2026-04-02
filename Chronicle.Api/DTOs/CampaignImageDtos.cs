using System.ComponentModel.DataAnnotations;

namespace Chronicle.Api.DTOs;

public class CampaignImageDto
{
    public Guid Id { get; set; }
    public Guid GameRoomId { get; set; }
    public string UploaderUserId { get; set; } = "";
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long FileSizeBytes { get; set; }
    public string? Caption { get; set; }
    public bool IsPublished { get; set; }
    public List<string>? PublishedToUserIds { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateCampaignImageRequest
{
    [MaxLength(200)]
    public string? Caption { get; set; }
    public bool? IsPublished { get; set; }
    /// <summary>null = all members; empty list = unpublished from specific users; list = published to those users</summary>
    public List<string>? PublishedToUserIds { get; set; }
}
