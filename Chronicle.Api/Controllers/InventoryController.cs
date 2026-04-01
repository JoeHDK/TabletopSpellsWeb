using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Hubs;
using Chronicle.Api.Models;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/characters/{characterId:guid}/inventory")]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _notifHub;
    private readonly WebPushService _pushService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public InventoryController(AppDbContext db, IHubContext<NotificationHub> notifHub, WebPushService pushService)
    {
        _db = db;
        _notifHub = notifHub;
        _pushService = pushService;
    }

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
    public async Task<IActionResult> GetAll(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var items = await _db.InventoryItems
            .Where(i => i.CharacterId == characterId)
            .Include(i => i.GrantedBy)
            .OrderBy(i => i.AcquiredAt)
            .ToListAsync();

        return Ok(items.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Add(Guid characterId, [FromBody] AddInventoryItemRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var item = new CharacterInventoryItemEntity
        {
            CharacterId = characterId,
            ItemSource = req.ItemSource,
            SrdItemIndex = req.SrdItemIndex,
            CustomItemId = req.CustomItemId,
            Name = req.Name,
            Quantity = req.Quantity,
            AcBonus = req.AcBonus,
            ArmorType = req.ArmorType,
            DamageOverride = req.DamageOverride,
            IsTwoHanded = req.IsTwoHanded,
            Notes = req.Notes,
        };

        _db.InventoryItems.Add(item);
        await _db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [HttpPatch("{itemId:guid}/equip")]
    public async Task<IActionResult> Equip(Guid characterId, Guid itemId, [FromBody] EquipItemRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var item = await _db.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
        if (item == null) return NotFound();

        item.IsEquipped = req.IsEquipped;
        item.EquippedSlot = req.IsEquipped ? req.Slot : null;
        if (req.ArmorType.HasValue) item.ArmorType = req.ArmorType.Value;
        if (req.IsEquipped && req.IsTwoHanded) item.IsTwoHanded = req.IsTwoHanded;

        if (req.IsEquipped && (req.Slot == InventorySlot.Ring1 || req.Slot == InventorySlot.Ring2))
        {
            var equippedRings = await _db.InventoryItems
                .Where(i => i.CharacterId == characterId && i.Id != itemId && i.IsEquipped &&
                            (i.EquippedSlot == InventorySlot.Ring1 || i.EquippedSlot == InventorySlot.Ring2))
                .CountAsync();
            if (equippedRings >= 2) return BadRequest("Both ring slots are already occupied.");
        }

        await _db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [HttpDelete("{itemId:guid}")]
    public async Task<IActionResult> Remove(Guid characterId, Guid itemId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var item = await _db.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
        if (item == null) return NotFound();

        _db.InventoryItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{itemId:guid}/send")]
    public async Task<IActionResult> SendToCharacter(Guid characterId, Guid itemId, [FromBody] SendItemRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var item = await _db.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
        if (item == null) return NotFound();

        // Verify recipient character is in the same game
        var senderChar = await _db.Characters.FindAsync(characterId);
        var recipientChar = await _db.Characters.FindAsync(req.RecipientCharacterId);

        if (recipientChar == null) return NotFound("Recipient character not found.");
        if (senderChar?.GameRoomId == null || senderChar.GameRoomId != recipientChar.GameRoomId)
            return BadRequest("Both characters must be in the same game to trade items.");

        // Move item to recipient
        item.CharacterId = req.RecipientCharacterId;
        item.IsEquipped = false;
        item.EquippedSlot = null;
        item.GrantedByUserId = UserId;

        var tradeNotif = new NotificationEntity
        {
            UserId = recipientChar.UserId,
            Type = NotificationType.ItemReceived,
            Title = "You received an item",
            Message = $"{User.Identity?.Name ?? "A player"} sent \"{item.Name}\" (×{item.Quantity}) to {recipientChar.Name}.",
            Link = $"/characters/{recipientChar.Id}/inventory",
        };
        _db.Notifications.Add(tradeNotif);

        await _db.SaveChangesAsync();
        await PushNotifAsync(tradeNotif);
        return NoContent();
    }

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    private static InventoryItemDto ToDto(CharacterInventoryItemEntity e) => new()
    {
        Id = e.Id,
        ItemSource = e.ItemSource.ToString(),
        SrdItemIndex = e.SrdItemIndex,
        CustomItemId = e.CustomItemId,
        Name = e.Name,
        Quantity = e.Quantity,
        IsEquipped = e.IsEquipped,
        EquippedSlot = e.EquippedSlot?.ToString(),
        AcBonus = e.AcBonus,
        ArmorType = e.ArmorType?.ToString(),
        DamageOverride = e.DamageOverride,
        DamageEntries = e.DamageEntriesJson != null
            ? JsonSerializer.Deserialize<List<DamageEntryDto>>(e.DamageEntriesJson)
            : null,
        IsTwoHanded = e.IsTwoHanded,
        StrBonus = e.StrBonus,
        ConBonus = e.ConBonus,
        DexBonus = e.DexBonus,
        WisBonus = e.WisBonus,
        IntBonus = e.IntBonus,
        ChaBonus = e.ChaBonus,
        Notes = e.Notes,
        GrantedByUsername = e.GrantedBy?.UserName,
        AcquiredAt = e.AcquiredAt,
    };
}
