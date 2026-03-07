using System.ComponentModel.DataAnnotations;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.DTOs;

public class ConversationDto
{
    public Guid Id { get; set; }
    public ChatConversationType Type { get; set; }
    public string? Name { get; set; }
    public Guid? GameRoomId { get; set; }
    public List<ChatParticipantDto> Participants { get; set; } = [];
    public MessageDto? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ChatParticipantDto
{
    public string UserId { get; set; } = "";
    public string Username { get; set; } = "";
    public bool IsAdmin { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string SenderId { get; set; } = "";
    public string SenderUsername { get; set; } = "";
    public string? Content { get; set; }
    public DateTime SentAt { get; set; }
    public bool IsDeleted { get; set; }
}

public class SendMessageRequest
{
    [Required, StringLength(4000, MinimumLength = 1)]
    public required string Content { get; set; }
}

public class CreateDirectConversationRequest
{
    [Required]
    public required string TargetUserId { get; set; }
}

public class CreateGroupConversationRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }
    public List<string> ParticipantUserIds { get; set; } = [];
}

public class AddChatParticipantRequest
{
    [Required]
    public required string UserId { get; set; }
}

public class MessagesPageDto
{
    public List<MessageDto> Messages { get; set; } = [];
    public bool HasMore { get; set; }
    public Guid? NextCursor { get; set; }
}
