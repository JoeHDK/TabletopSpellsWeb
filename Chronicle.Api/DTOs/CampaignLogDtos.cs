using System.ComponentModel.DataAnnotations;

namespace Chronicle.Api.DTOs;

public class CampaignLogEntryDto
{
    public Guid Id { get; set; }
    public Guid GameRoomId { get; set; }
    public string AuthorUserId { get; set; } = "";
    public string AuthorUsername { get; set; } = "";
    public string? Title { get; set; }
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateCampaignLogEntryRequest
{
    [MaxLength(200)]
    public string? Title { get; set; }

    [Required, MaxLength(50_000)]
    public required string Content { get; set; }
}

public class UpdateCampaignLogEntryRequest
{
    [MaxLength(200)]
    public string? Title { get; set; }

    [Required, MaxLength(50_000)]
    public required string Content { get; set; }
}
