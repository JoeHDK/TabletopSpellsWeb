using System.ComponentModel.DataAnnotations;

namespace Chronicle.Api.DTOs;

public class CampaignLogEntryDto
{
    public Guid Id { get; set; }
    public Guid GameRoomId { get; set; }
    public string AuthorUserId { get; set; } = "";
    public string AuthorUsername { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateCampaignLogEntryRequest
{
    [Required, MaxLength(50_000)]
    public required string Content { get; set; }
}

public class UpdateCampaignLogEntryRequest
{
    [Required, MaxLength(50_000)]
    public required string Content { get; set; }
}
