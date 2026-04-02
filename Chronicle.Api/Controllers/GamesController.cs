using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Hubs;
using Chronicle.Api.Models.Enums;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly EncryptionService _encryption;
    private readonly IHubContext<NotificationHub> _notifHub;
    private readonly WebPushService _pushService;

    public GamesController(AppDbContext db, UserManager<AppUser> userManager, EncryptionService encryption, IHubContext<NotificationHub> notifHub, WebPushService pushService)
    {
        _db = db;
        _userManager = userManager;
        _encryption = encryption;
        _notifHub = notifHub;
        _pushService = pushService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task PushNotifAsync(NotificationEntity entity)
    {
        var dto = new NotificationDto
        {
            Id = entity.Id,
            Type = entity.Type.ToString(),
            Title = entity.Title,
            Message = entity.Message,
            Link = entity.Link,
            IsRead = false,
            CreatedAt = entity.CreatedAt,
        };
        await _notifHub.Clients.Group($"notifications-{entity.UserId}").SendAsync("ReceiveNotification", dto);
        await _pushService.SendNotificationAsync(entity.UserId, dto);
    }

    [HttpGet]
    public async Task<IActionResult> GetMyGames()
    {
        var memberships = await _db.GameMembers
            .Where(m => m.UserId == UserId)
            .Include(m => m.GameRoom)
                .ThenInclude(g => g!.DmUser)
            .Include(m => m.GameRoom)
                .ThenInclude(g => g!.Members)
            .ToListAsync();

        var result = memberships.Select(m => new GameSummaryDto
        {
            Id = m.GameRoom!.Id,
            Name = m.GameRoom.Name,
            DmUsername = m.GameRoom.DmUser?.UserName ?? "",
            MyRole = m.Role,
            MemberCount = m.GameRoom.Members.Count,
            CreatedAt = m.GameRoom.CreatedAt,
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetGame(Guid id)
    {
        var membership = await _db.GameMembers
            .FirstOrDefaultAsync(m => m.GameRoomId == id && m.UserId == UserId);
        if (membership == null) return NotFound();

        var game = await _db.GameRooms
            .Include(g => g.DmUser)
            .Include(g => g.Members).ThenInclude(m => m.User)
            .Include(g => g.Characters).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (game == null) return NotFound();

        return Ok(ToDto(game, membership.Role));
    }

    [HttpPost]
    public async Task<IActionResult> CreateGame([FromBody] CreateGameRequest req)
    {
        var inviteCode = GenerateInviteCode();
        var game = new GameRoomEntity
        {
            Name = req.Name,
            DmUserId = UserId,
            InviteCode = inviteCode,
        };

        _db.GameRooms.Add(game);

        var membership = new GameMemberEntity
        {
            GameRoomId = game.Id,
            UserId = UserId,
            Role = GameRole.DM,
        };
        _db.GameMembers.Add(membership);

        // Create the shared game room chat conversation
        var chatConv = new ChatConversationEntity
        {
            Type = ChatConversationType.GameRoom,
            Name = req.Name,
            GameRoomId = game.Id,
            CreatedByUserId = UserId,
            EncryptedKeyBase64 = _encryption.GenerateAndEncryptConversationKey(),
        };
        _db.ChatConversations.Add(chatConv);
        _db.ChatParticipants.Add(new ChatParticipantEntity
        {
            ConversationId = chatConv.Id,
            UserId = UserId,
            IsAdmin = true,
        });

        await _db.SaveChangesAsync();

        var created = await _db.GameRooms
            .Include(g => g.DmUser)
            .Include(g => g.Members).ThenInclude(m => m.User)
            .Include(g => g.Characters).ThenInclude(c => c.User)
            .FirstAsync(g => g.Id == game.Id);

        return Ok(ToDto(created, GameRole.DM));
    }

    [HttpPost("join")]
    public async Task<IActionResult> JoinByCode([FromBody] JoinGameRequest req)
    {
        var game = await _db.GameRooms
            .Include(g => g.DmUser)
            .Include(g => g.Members).ThenInclude(m => m.User)
            .Include(g => g.Characters).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(g => g.InviteCode == req.InviteCode.Trim().ToUpper());

        if (game == null) return NotFound("Invalid invite code.");

        if (game.Members.Any(m => m.UserId == UserId))
            return Conflict("You are already a member of this game.");

        var membership = new GameMemberEntity
        {
            GameRoomId = game.Id,
            UserId = UserId,
            Role = GameRole.Player,
        };
        _db.GameMembers.Add(membership);

        // Add joining user to the game room's chat conversation
        await AddUserToGameRoomChat(game.Id, UserId);

        await _db.SaveChangesAsync();

        return Ok(ToDto(game, GameRole.Player));
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMemberByUsername(Guid id, [FromBody] AddMemberRequest req)
    {
        if (!await IsDmOrAdmin(id)) return Forbid();

        var targetUser = await _userManager.FindByNameAsync(req.Username);
        if (targetUser == null) return NotFound("User not found.");

        if (await _db.GameMembers.AnyAsync(m => m.GameRoomId == id && m.UserId == targetUser.Id))
            return Conflict("User is already a member.");

        var membership = new GameMemberEntity
        {
            GameRoomId = id,
            UserId = targetUser.Id,
            Role = GameRole.Player,
        };
        _db.GameMembers.Add(membership);

        var game = await _db.GameRooms.FindAsync(id);
        var inviterName = User.Identity?.Name ?? "The DM";
        var gameInviteNotif = new NotificationEntity
        {
            UserId = targetUser.Id,
            Type = NotificationType.GameInvite,
            Title = "You've been added to a game",
            Message = $"{inviterName} added you to \"{game?.Name ?? "a game"}\".",
            Link = $"/games/{id}",
        };
        _db.Notifications.Add(gameInviteNotif);

        // Add new member to the game room's chat conversation
        await AddUserToGameRoomChat(id, targetUser.Id);

        await _db.SaveChangesAsync();
        await PushNotifAsync(gameInviteNotif);

        return Ok(new GameMemberDto
        {
            UserId = targetUser.Id,
            Username = targetUser.UserName ?? "",
            Role = GameRole.Player,
            JoinedAt = membership.JoinedAt,
        });
    }

    [HttpDelete("{id:guid}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(Guid id, string userId)
    {
        var isDmOrAdmin = await IsDmOrAdmin(id);
        var isSelf = userId == UserId;

        if (!isDmOrAdmin && !isSelf) return Forbid();

        var membership = await _db.GameMembers
            .FirstOrDefaultAsync(m => m.GameRoomId == id && m.UserId == userId);
        if (membership == null) return NotFound();

        // DM cannot be removed (only self-delete by leaving)
        if (membership.Role == GameRole.DM && !isSelf) return Forbid();

        // If DM leaves, delete the game room (cascades members; unlink characters first)
        if (membership.Role == GameRole.DM)
        {
            var characters = await _db.Characters.Where(c => c.GameRoomId == id).ToListAsync();
            foreach (var c in characters) c.GameRoomId = null;
            await _db.SaveChangesAsync();

            var gameRoom = await _db.GameRooms.FindAsync(id);
            if (gameRoom != null) _db.GameRooms.Remove(gameRoom);
        }
        else
        {
            // Unlink the leaving player's characters
            var characters = await _db.Characters
                .Where(c => c.GameRoomId == id && c.UserId == userId)
                .ToListAsync();
            foreach (var c in characters) c.GameRoomId = null;

            // Remove from the game room's chat conversation
            await RemoveUserFromGameRoomChat(id, userId);

            _db.GameMembers.Remove(membership);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/characters")]
    public async Task<IActionResult> LinkCharacter(Guid id, [FromBody] LinkCharacterRequest req)
    {
        if (!await IsMember(id)) return Forbid();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == req.CharacterId && c.UserId == UserId);
        if (character == null) return NotFound("Character not found.");

        if (character.GameRoomId.HasValue)
            return Conflict("Character is already linked to a game. Remove it first.");

        character.GameRoomId = id;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}/characters/{characterId:guid}")]
    public async Task<IActionResult> UnlinkCharacter(Guid id, Guid characterId)
    {
        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.GameRoomId == id);
        if (character == null) return NotFound();

        var isDmOrAdmin = await IsDmOrAdmin(id);
        var isOwner = character.UserId == UserId;
        if (!isDmOrAdmin && !isOwner) return Forbid();

        character.GameRoomId = null;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/give-item")]
    public async Task<IActionResult> GiveItem(Guid id, [FromBody] GiveItemRequest req)
    {
        if (!await IsDmOrAdmin(id)) return Forbid();

        var recipientChar = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == req.RecipientCharacterId && c.GameRoomId == id);
        if (recipientChar == null) return NotFound("Recipient character not found in this game.");

        // Auto-copy properties from the custom item if one is referenced
        int? acBonus = req.AcBonus;
        string? damageOverride = req.DamageOverride;
        string? damageEntriesJson = req.DamageEntries is { Count: > 0 }
            ? System.Text.Json.JsonSerializer.Serialize(req.DamageEntries)
            : null;
        int? strBonus = req.StrBonus, conBonus = req.ConBonus, dexBonus = req.DexBonus;
        int? wisBonus = req.WisBonus, intBonus = req.IntBonus, chaBonus = req.ChaBonus;
        int? savingThrowBonus = req.SavingThrowBonus;
        string? notes = req.Notes;

        if (req.CustomItemId.HasValue)
        {
            var ci = await _db.CustomItems.FindAsync(req.CustomItemId.Value);
            if (ci is not null)
            {
                acBonus ??= ci.AcBonus;
                damageOverride ??= ci.Damage;
                damageEntriesJson ??= ci.DamageEntriesJson;
                strBonus ??= ci.StrBonus;
                conBonus ??= ci.ConBonus;
                dexBonus ??= ci.DexBonus;
                wisBonus ??= ci.WisBonus;
                intBonus ??= ci.IntBonus;
                chaBonus ??= ci.ChaBonus;
                savingThrowBonus ??= ci.SavingThrowBonus;
                notes ??= ci.Description;
            }
        }

        var item = new CharacterInventoryItemEntity
        {
            CharacterId = req.RecipientCharacterId,
            ItemSource = req.ItemSource,
            SrdItemIndex = req.SrdItemIndex,
            CustomItemId = req.CustomItemId,
            Name = req.Name,
            Quantity = req.Quantity,
            AcBonus = acBonus,
            ArmorType = req.ArmorType,
            DamageOverride = damageOverride,
            DamageEntriesJson = damageEntriesJson,
            StrBonus = strBonus,
            ConBonus = conBonus,
            DexBonus = dexBonus,
            WisBonus = wisBonus,
            IntBonus = intBonus,
            ChaBonus = chaBonus,
            SavingThrowBonus = savingThrowBonus,
            Notes = notes,
            GrantedByUserId = UserId,
        };

        _db.InventoryItems.Add(item);

        var game = await _db.GameRooms.FindAsync(id);
        var giver = User.Identity?.Name ?? "The DM";
        var itemNotif = new NotificationEntity
        {
            UserId = recipientChar.UserId,
            Type = NotificationType.ItemReceived,
            Title = "You received an item",
            Message = $"{giver} gave \"{req.Name}\" (×{req.Quantity}) to {recipientChar.Name} in \"{game?.Name ?? "your game"}\".",
            Link = $"/characters/{recipientChar.Id}/inventory",
        };
        _db.Notifications.Add(itemNotif);

        await _db.SaveChangesAsync();
        await PushNotifAsync(itemNotif);
        return Ok();
    }

    [HttpGet("{id:guid}/loot")]
    public async Task<IActionResult> GetLoot(Guid id)
    {
        if (!await IsDmOrAdmin(id)) return Forbid();

        var items = await _db.GameLootItems
            .Where(l => l.GameRoomId == id)
            .OrderBy(l => l.CreatedAt)
            .Select(l => new LootItemDto
            {
                Id = l.Id,
                Name = l.Name,
                ItemSource = l.ItemSource,
                SrdItemIndex = l.SrdItemIndex,
                CustomItemId = l.CustomItemId,
                Quantity = l.Quantity,
                AcBonus = l.AcBonus,
                DamageOverride = l.DamageOverride,
                Notes = l.Notes,
                CreatedAt = l.CreatedAt,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("{id:guid}/loot")]
    public async Task<IActionResult> CreateLootItem(Guid id, [FromBody] CreateLootItemRequest req)
    {
        if (!await IsDmOrAdmin(id)) return Forbid();

        var item = new GameLootItemEntity
        {
            GameRoomId = id,
            Name = req.Name,
            ItemSource = req.ItemSource,
            SrdItemIndex = req.SrdItemIndex,
            CustomItemId = req.CustomItemId,
            Quantity = req.Quantity,
            AcBonus = req.AcBonus,
            DamageOverride = req.DamageOverride,
            Notes = req.Notes,
        };

        _db.GameLootItems.Add(item);
        await _db.SaveChangesAsync();

        return Ok(new LootItemDto
        {
            Id = item.Id,
            Name = item.Name,
            ItemSource = item.ItemSource,
            SrdItemIndex = item.SrdItemIndex,
            CustomItemId = item.CustomItemId,
            Quantity = item.Quantity,
            AcBonus = item.AcBonus,
            DamageOverride = item.DamageOverride,
            Notes = item.Notes,
            CreatedAt = item.CreatedAt,
        });
    }

    [HttpDelete("{id:guid}/loot/{itemId:guid}")]
    public async Task<IActionResult> DeleteLootItem(Guid id, Guid itemId)
    {
        if (!await IsDmOrAdmin(id)) return Forbid();

        var item = await _db.GameLootItems
            .FirstOrDefaultAsync(l => l.Id == itemId && l.GameRoomId == id);
        if (item == null) return NotFound();

        _db.GameLootItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> IsMember(Guid gameId) =>
        await _db.GameMembers.AnyAsync(m => m.GameRoomId == gameId && m.UserId == UserId)
        || await IsGlobalAdmin();

    private async Task<bool> IsDmOrAdmin(Guid gameId)
    {
        if (await IsGlobalAdmin()) return true;
        return await _db.GameMembers.AnyAsync(m =>
            m.GameRoomId == gameId && m.UserId == UserId && m.Role == GameRole.DM);
    }

    private async Task<bool> IsGlobalAdmin()
    {
        var user = await _userManager.FindByIdAsync(UserId);
        return user?.IsAdmin ?? false;
    }

    [HttpGet("{id:guid}/party")]
    public async Task<IActionResult> GetParty(Guid id)
    {
        if (!await IsMember(id)) return Forbid();

        var characters = await _db.Characters
            .Where(c => c.GameRoomId == id)
            .Include(c => c.User)
            .Include(c => c.Inventory)
            .ToListAsync();

        var result = characters.Select(c =>
        {
            var abilityScores = JsonConvert.DeserializeObject<Dictionary<string, int>>(c.AbilityScoresJson) ?? new();
            var wisScore = abilityScores.GetValueOrDefault("Wisdom", 10);
            var wisMod = (wisScore - 10) / 2;
            var passivePerception = 10 + wisMod;

            var spellsUsed = JsonConvert.DeserializeObject<Dictionary<int, int>>(c.SpellsUsedTodayJson) ?? new();
            var maxSpells = JsonConvert.DeserializeObject<Dictionary<int, int>>(c.MaxSpellsPerDayJson) ?? new();
            var slotsRemaining = maxSpells.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value - spellsUsed.GetValueOrDefault(kvp.Key, 0));

            var equipmentAcBonus = c.Inventory
                .Where(i => i.IsEquipped && i.AcBonus.HasValue)
                .Sum(i => i.AcBonus!.Value);

            return new PartyMemberDto
            {
                CharacterId = c.Id,
                CharacterName = c.Name,
                OwnerUsername = c.User?.UserName ?? "",
                OwnerUserId = c.UserId,
                CharacterClass = c.CharacterClass.ToString(),
                Level = c.Level,
                CurrentHp = c.CurrentHp,
                MaxHp = c.MaxHp,
                BaseArmorClass = c.BaseArmorClass,
                EquipmentAcBonus = equipmentAcBonus,
                PassivePerception = passivePerception,
                SpellSlotsRemaining = slotsRemaining,
            };
        });

        return Ok(result);
    }

    private static string GenerateInviteCode()    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }

    private static GameRoomDto ToDto(GameRoomEntity g, GameRole myRole) => new()
    {
        Id = g.Id,
        Name = g.Name,
        DmUserId = g.DmUserId,
        DmUsername = g.DmUser?.UserName ?? "",
        InviteCode = g.InviteCode,
        MyRole = myRole,
        CreatedAt = g.CreatedAt,
        Members = g.Members.Select(m => new GameMemberDto
        {
            UserId = m.UserId,
            Username = m.User?.UserName ?? "",
            Role = m.Role,
            JoinedAt = m.JoinedAt,
        }).ToList(),
        Characters = g.Characters.Select(c => new GameCharacterDto
        {
            CharacterId = c.Id,
            CharacterName = c.Name,
            OwnerUsername = c.User?.UserName ?? "",
            CharacterClass = c.CharacterClass.ToString(),
            Level = c.Level,
        }).ToList(),
    };

    private async Task AddUserToGameRoomChat(Guid gameRoomId, string userId)
    {
        var conv = await _db.ChatConversations
            .FirstOrDefaultAsync(c => c.GameRoomId == gameRoomId && c.Type == ChatConversationType.GameRoom);
        if (conv == null) return;

        var alreadyParticipant = await _db.ChatParticipants
            .AnyAsync(p => p.ConversationId == conv.Id && p.UserId == userId);
        if (alreadyParticipant) return;

        _db.ChatParticipants.Add(new ChatParticipantEntity
        {
            ConversationId = conv.Id,
            UserId = userId,
            IsAdmin = false,
        });
    }

    private async Task RemoveUserFromGameRoomChat(Guid gameRoomId, string userId)
    {
        var conv = await _db.ChatConversations
            .FirstOrDefaultAsync(c => c.GameRoomId == gameRoomId && c.Type == ChatConversationType.GameRoom);
        if (conv == null) return;

        var participant = await _db.ChatParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conv.Id && p.UserId == userId);
        if (participant != null)
            _db.ChatParticipants.Remove(participant);
    }
}
