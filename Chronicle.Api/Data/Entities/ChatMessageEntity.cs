using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class ChatMessageEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConversationId { get; set; }
    [Required] public required string SenderId { get; set; }
    /// <summary>AES-256-GCM ciphertext (base64).</summary>
    public string? EncryptedContent { get; set; }
    /// <summary>96-bit GCM nonce (base64).</summary>
    public string? Iv { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }

    [ForeignKey(nameof(ConversationId))] public ChatConversationEntity? Conversation { get; set; }
    [ForeignKey(nameof(SenderId))] public AppUser? Sender { get; set; }
}
