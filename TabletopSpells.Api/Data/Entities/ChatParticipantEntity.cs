using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class ChatParticipantEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConversationId { get; set; }
    [Required] public required string UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; set; }
    public bool IsAdmin { get; set; }

    [ForeignKey(nameof(ConversationId))] public ChatConversationEntity? Conversation { get; set; }
    [ForeignKey(nameof(UserId))] public AppUser? User { get; set; }
}
