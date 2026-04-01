using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Data.Entities;

public class ChatConversationEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public ChatConversationType Type { get; set; }
    [StringLength(100)] public string? Name { get; set; }
    public Guid? GameRoomId { get; set; }
    [Required] public required string CreatedByUserId { get; set; }
    /// <summary>AES-256 conversation key, wrapped by the server master key (base64).</summary>
    [Required] public required string EncryptedKeyBase64 { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }
    [ForeignKey(nameof(CreatedByUserId))] public AppUser? CreatedBy { get; set; }
    public ICollection<ChatParticipantEntity> Participants { get; set; } = new List<ChatParticipantEntity>();
    public ICollection<ChatMessageEntity> Messages { get; set; } = new List<ChatMessageEntity>();
}
