using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TabletopSpells.Api.Data;
using TabletopSpells.Api.Data.Entities;
using TabletopSpells.Api.DTOs;

namespace TabletopSpells.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/characters/{characterId:guid}/inventory")]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public InventoryController(AppDbContext db) => _db = db;

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
            DamageOverride = req.DamageOverride,
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

        _db.Notifications.Add(new Data.Entities.NotificationEntity
        {
            UserId = recipientChar.UserId,
            Type = Data.Entities.NotificationType.ItemReceived,
            Title = "You received an item",
            Message = $"{User.Identity?.Name ?? "A player"} sent \"{item.Name}\" (×{item.Quantity}) to {recipientChar.Name}.",
            Link = $"/characters/{recipientChar.Id}/inventory",
        });

        await _db.SaveChangesAsync();
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
        DamageOverride = e.DamageOverride,
        Notes = e.Notes,
        GrantedByUsername = e.GrantedBy?.UserName,
        AcquiredAt = e.AcquiredAt,
    };
}
