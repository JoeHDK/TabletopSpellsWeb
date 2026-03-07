using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TabletopSpells.Api.Data;
using TabletopSpells.Api.Data.Entities;
using TabletopSpells.Api.DTOs;
using TabletopSpells.Api.Hubs;
using TabletopSpells.Api.Models.Enums;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly EncryptionService _encryption;
    private readonly UserManager<AppUser> _userManager;
    private readonly IHubContext<ChatHub> _hub;

    public ChatController(
        AppDbContext db,
        EncryptionService encryption,
        UserManager<AppUser> userManager,
        IHubContext<ChatHub> hub)
    {
        _db = db;
        _encryption = encryption;
        _userManager = userManager;
        _hub = hub;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ── Conversations ────────────────────────────────────────────────────────

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var participations = await _db.ChatParticipants
            .Where(p => p.UserId == UserId)
            .Include(p => p.Conversation)
                .ThenInclude(c => c!.Participants)
                    .ThenInclude(cp => cp.User)
            .ToListAsync();

        var result = new List<ConversationDto>();
        foreach (var participation in participations)
        {
            var conv = participation.Conversation!;
            var lastMessage = await _db.ChatMessages
                .Where(m => m.ConversationId == conv.Id && !m.IsDeleted)
                .OrderByDescending(m => m.SentAt)
                .Include(m => m.Sender)
                .FirstOrDefaultAsync();

            var unreadCount = participation.LastReadAt == null
                ? await _db.ChatMessages.CountAsync(m => m.ConversationId == conv.Id && !m.IsDeleted && m.SenderId != UserId)
                : await _db.ChatMessages.CountAsync(m =>
                    m.ConversationId == conv.Id && !m.IsDeleted && m.SenderId != UserId && m.SentAt > participation.LastReadAt);

            result.Add(MapConversation(conv, lastMessage, unreadCount));
        }

        return Ok(result.OrderByDescending(c => c.LastMessage?.SentAt ?? c.CreatedAt));
    }

    [HttpGet("conversations/{id:guid}")]
    public async Task<IActionResult> GetConversation(Guid id)
    {
        var participation = await _db.ChatParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == id && p.UserId == UserId);
        if (participation == null) return NotFound();

        var conv = await _db.ChatConversations
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (conv == null) return NotFound();

        return Ok(MapConversation(conv, null, 0));
    }

    [HttpPost("conversations/direct")]
    public async Task<IActionResult> GetOrCreateDirect([FromBody] CreateDirectConversationRequest req)
    {
        if (req.TargetUserId == UserId) return BadRequest("Cannot create a conversation with yourself.");

        var target = await _userManager.FindByIdAsync(req.TargetUserId);
        if (target == null) return NotFound("Target user not found.");

        // Check if a direct conversation already exists between the two users
        var existing = await _db.ChatConversations
            .Include(c => c.Participants)
            .Where(c => c.Type == ChatConversationType.Direct
                && c.Participants.Any(p => p.UserId == UserId)
                && c.Participants.Any(p => p.UserId == req.TargetUserId))
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            return Ok(MapConversation(existing, null, 0));
        }

        var conv = new ChatConversationEntity
        {
            Type = ChatConversationType.Direct,
            CreatedByUserId = UserId,
            EncryptedKeyBase64 = _encryption.GenerateAndEncryptConversationKey(),
        };
        _db.ChatConversations.Add(conv);

        var currentUser = await _userManager.FindByIdAsync(UserId);
        _db.ChatParticipants.AddRange(
            new ChatParticipantEntity { ConversationId = conv.Id, UserId = UserId, IsAdmin = true },
            new ChatParticipantEntity { ConversationId = conv.Id, UserId = req.TargetUserId, IsAdmin = true }
        );

        await _db.SaveChangesAsync();

        var created = await _db.ChatConversations
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .FirstAsync(c => c.Id == conv.Id);

        var dto = MapConversation(created, null, 0);

        // Notify both participants via their personal SignalR groups
        await _hub.Clients.Group($"user:{UserId}").SendAsync("ConversationCreated", dto);
        await _hub.Clients.Group($"user:{req.TargetUserId}").SendAsync("ConversationCreated", dto);

        return Ok(dto);
    }

    [HttpPost("conversations/group")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupConversationRequest req)
    {
        var conv = new ChatConversationEntity
        {
            Type = ChatConversationType.Group,
            Name = req.Name,
            CreatedByUserId = UserId,
            EncryptedKeyBase64 = _encryption.GenerateAndEncryptConversationKey(),
        };
        _db.ChatConversations.Add(conv);

        var participantIds = req.ParticipantUserIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        if (!participantIds.Contains(UserId)) participantIds.Add(UserId);

        foreach (var uid in participantIds)
        {
            _db.ChatParticipants.Add(new ChatParticipantEntity
            {
                ConversationId = conv.Id,
                UserId = uid,
                IsAdmin = uid == UserId,
            });
        }

        await _db.SaveChangesAsync();

        var created = await _db.ChatConversations
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .FirstAsync(c => c.Id == conv.Id);

        var dto = MapConversation(created, null, 0);
        foreach (var uid in participantIds)
            await _hub.Clients.Group($"user:{uid}").SendAsync("ConversationCreated", dto);

        return Ok(dto);
    }

    // ── Participants ─────────────────────────────────────────────────────────

    [HttpPost("conversations/{id:guid}/participants")]
    public async Task<IActionResult> AddParticipant(Guid id, [FromBody] AddChatParticipantRequest req)
    {
        var conv = await _db.ChatConversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (conv == null) return NotFound();

        // Only admins can add participants to Group chats; GameRoom chats are managed automatically
        if (conv.Type == ChatConversationType.Group)
        {
            var isMeAdmin = conv.Participants.Any(p => p.UserId == UserId && p.IsAdmin);
            if (!isMeAdmin) return Forbid();
        }
        else
        {
            return BadRequest("Participants can only be added manually to Group conversations.");
        }

        if (conv.Participants.Any(p => p.UserId == req.UserId))
            return Conflict("User is already a participant.");

        var user = await _userManager.FindByIdAsync(req.UserId);
        if (user == null) return NotFound("User not found.");

        var participant = new ChatParticipantEntity
        {
            ConversationId = id,
            UserId = req.UserId,
            IsAdmin = false,
        };
        _db.ChatParticipants.Add(participant);
        await _db.SaveChangesAsync();

        var participantDto = new ChatParticipantDto
        {
            UserId = req.UserId,
            Username = user.UserName ?? "",
            IsAdmin = false,
            JoinedAt = participant.JoinedAt,
        };

        await _hub.Clients.Group($"conv:{id}").SendAsync("ParticipantAdded", id, participantDto);
        await _hub.Clients.Group($"user:{req.UserId}").SendAsync("ConversationCreated",
            MapConversation(await _db.ChatConversations
                .Include(c => c.Participants).ThenInclude(p => p.User)
                .FirstAsync(c => c.Id == id), null, 0));

        return Ok(participantDto);
    }

    [HttpDelete("conversations/{id:guid}/participants/{userId}")]
    public async Task<IActionResult> RemoveParticipant(Guid id, string userId)
    {
        var conv = await _db.ChatConversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (conv == null) return NotFound();

        var isSelf = userId == UserId;
        var isMeAdmin = conv.Participants.Any(p => p.UserId == UserId && p.IsAdmin);

        if (!isSelf && !isMeAdmin) return Forbid();
        if (conv.Type != ChatConversationType.Group && !isSelf) return BadRequest("Cannot remove others from non-group conversations.");

        var participant = conv.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null) return NotFound();

        _db.ChatParticipants.Remove(participant);
        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"conv:{id}").SendAsync("ParticipantRemoved", id, userId);
        return NoContent();
    }

    // ── Messages ─────────────────────────────────────────────────────────────

    [HttpGet("conversations/{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid id, [FromQuery] Guid? before, [FromQuery] int limit = 50)
    {
        var isMember = await _db.ChatParticipants.AnyAsync(p => p.ConversationId == id && p.UserId == UserId);
        if (!isMember) return Forbid();

        if (limit is < 1 or > 100) limit = 50;

        var conv = await _db.ChatConversations.FindAsync(id);
        if (conv == null) return NotFound();

        var convKey = _encryption.DecryptConversationKey(conv.EncryptedKeyBase64);

        var query = _db.ChatMessages
            .Where(m => m.ConversationId == id)
            .Include(m => m.Sender);

        if (before.HasValue)
        {
            var pivotTime = await _db.ChatMessages
                .Where(m => m.Id == before.Value)
                .Select(m => (DateTime?)m.SentAt)
                .FirstOrDefaultAsync();
            if (pivotTime.HasValue)
                query = (Microsoft.EntityFrameworkCore.Query.IIncludableQueryable<ChatMessageEntity, AppUser?>)
                    query.Where(m => m.SentAt < pivotTime.Value);
        }

        var messages = await query
            .OrderByDescending(m => m.SentAt)
            .Take(limit + 1)
            .ToListAsync();

        var hasMore = messages.Count > limit;
        if (hasMore) messages.RemoveAt(messages.Count - 1);

        var dtos = messages
            .OrderBy(m => m.SentAt)
            .Select(m => DecryptToDto(m, convKey))
            .ToList();

        return Ok(new MessagesPageDto
        {
            Messages = dtos,
            HasMore = hasMore,
            NextCursor = hasMore ? messages.First().Id : null,
        });
    }

    [HttpPost("conversations/{id:guid}/messages")]
    public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageRequest req)
    {
        var isMember = await _db.ChatParticipants.AnyAsync(p => p.ConversationId == id && p.UserId == UserId);
        if (!isMember) return Forbid();

        var conv = await _db.ChatConversations.FindAsync(id);
        if (conv == null) return NotFound();

        var convKey = _encryption.DecryptConversationKey(conv.EncryptedKeyBase64);
        var (ciphertext, iv) = _encryption.EncryptMessage(req.Content.Trim(), convKey);

        var message = new ChatMessageEntity
        {
            ConversationId = id,
            SenderId = UserId,
            EncryptedContent = ciphertext,
            Iv = iv,
        };
        _db.ChatMessages.Add(message);

        // Mark as read for the sender so their own message never shows as unread.
        var senderParticipant = await _db.ChatParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == id && p.UserId == UserId);
        if (senderParticipant != null)
            senderParticipant.LastReadAt = message.SentAt;

        await _db.SaveChangesAsync();

        var sender = await _userManager.FindByIdAsync(UserId);
        var dto = new MessageDto
        {
            Id = message.Id,
            ConversationId = id,
            SenderId = UserId,
            SenderUsername = sender?.UserName ?? "",
            Content = req.Content.Trim(),
            SentAt = message.SentAt,
            IsDeleted = false,
        };

        await _hub.Clients.Group($"conv:{id}").SendAsync("ReceiveMessage", dto);

        return Ok(dto);
    }

    [HttpDelete("conversations/{id:guid}/messages/{messageId:guid}")]
    public async Task<IActionResult> DeleteMessage(Guid id, Guid messageId)
    {
        var message = await _db.ChatMessages
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ConversationId == id);
        if (message == null) return NotFound();
        if (message.SenderId != UserId) return Forbid();

        message.IsDeleted = true;
        message.EncryptedContent = null;
        message.Iv = null;
        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"conv:{id}").SendAsync("MessageDeleted", id, messageId);
        return NoContent();
    }

    [HttpPost("conversations/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var participant = await _db.ChatParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == id && p.UserId == UserId);
        if (participant == null) return NotFound();

        participant.LastReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private MessageDto DecryptToDto(ChatMessageEntity m, byte[] convKey)
    {
        string? content = null;
        if (!m.IsDeleted && m.EncryptedContent != null && m.Iv != null)
        {
            try { content = _encryption.DecryptMessage(m.EncryptedContent, m.Iv, convKey); }
            catch { content = null; }
        }
        return new MessageDto
        {
            Id = m.Id,
            ConversationId = m.ConversationId,
            SenderId = m.SenderId,
            SenderUsername = m.Sender?.UserName ?? "",
            Content = content,
            SentAt = m.SentAt,
            IsDeleted = m.IsDeleted,
        };
    }

    private static ConversationDto MapConversation(
        ChatConversationEntity conv,
        ChatMessageEntity? lastMessage,
        int unreadCount) => new()
    {
        Id = conv.Id,
        Type = conv.Type,
        Name = conv.Name,
        GameRoomId = conv.GameRoomId,
        Participants = conv.Participants.Select(p => new ChatParticipantDto
        {
            UserId = p.UserId,
            Username = p.User?.UserName ?? "",
            IsAdmin = p.IsAdmin,
            JoinedAt = p.JoinedAt,
        }).ToList(),
        LastMessage = lastMessage == null ? null : new MessageDto
        {
            Id = lastMessage.Id,
            ConversationId = lastMessage.ConversationId,
            SenderId = lastMessage.SenderId,
            SenderUsername = lastMessage.Sender?.UserName ?? "",
            Content = null, // Preview not decrypted here (requires convKey)
            SentAt = lastMessage.SentAt,
            IsDeleted = lastMessage.IsDeleted,
        },
        UnreadCount = unreadCount,
        CreatedAt = conv.CreatedAt,
    };
}
