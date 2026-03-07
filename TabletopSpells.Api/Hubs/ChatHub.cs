using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TabletopSpells.Api.Data;
using TabletopSpells.Api.DTOs;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;
    private readonly EncryptionService _encryption;

    public ChatHub(AppDbContext db, EncryptionService encryption)
    {
        _db = db;
        _encryption = encryption;
    }

    private string UserId => Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>
    /// Called by client on connect / when opening a conversation.
    /// Validates membership, then adds the connection to the SignalR group for that conversation.
    /// </summary>
    public async Task JoinConversation(Guid conversationId)
    {
        var isMember = await _db.ChatParticipants.AnyAsync(p =>
            p.ConversationId == conversationId && p.UserId == UserId);
        if (!isMember) return;

        await Groups.AddToGroupAsync(Context.ConnectionId, ConvGroup(conversationId));
    }

    public async Task LeaveConversation(Guid conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ConvGroup(conversationId));
    }

    /// <summary>
    /// Send a message to a conversation.
    /// The message is encrypted server-side before persisting.
    /// </summary>
    public async Task SendMessage(Guid conversationId, string content)
    {
        if (string.IsNullOrWhiteSpace(content) || content.Length > 4000) return;

        var conversation = await _db.ChatConversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation == null) return;

        var isMember = conversation.Participants.Any(p => p.UserId == UserId);
        if (!isMember) return;

        var convKey = _encryption.DecryptConversationKey(conversation.EncryptedKeyBase64);
        var (ciphertext, iv) = _encryption.EncryptMessage(content.Trim(), convKey);

        var sender = await _db.Users.FindAsync(UserId);

        var message = new Data.Entities.ChatMessageEntity
        {
            ConversationId = conversationId,
            SenderId = UserId,
            EncryptedContent = ciphertext,
            Iv = iv,
        };
        _db.ChatMessages.Add(message);

        // Mark the conversation as read for the sender immediately — they wrote it,
        // so it should never count as unread for them.
        var senderParticipant = conversation.Participants.First(p => p.UserId == UserId);
        senderParticipant.LastReadAt = message.SentAt;

        await _db.SaveChangesAsync();

        var dto = new MessageDto
        {
            Id = message.Id,
            ConversationId = conversationId,
            SenderId = UserId,
            SenderUsername = sender?.UserName ?? "",
            Content = content.Trim(),
            SentAt = message.SentAt,
            IsDeleted = false,
        };

        await Clients.Group(ConvGroup(conversationId)).SendAsync("ReceiveMessage", dto);
    }

    private static string ConvGroup(Guid conversationId) => $"conv:{conversationId}";
}
