using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Models;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/characters/{characterId:guid}/equipment-resources")]
public class EquipmentResourcesController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    // GET api/characters/{id}/equipment-resources
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var equippedItems = await db.InventoryItems
            .Where(i => i.CharacterId == characterId && i.IsEquipped && i.CustomItemId.HasValue)
            .ToListAsync();

        var customItemIds = equippedItems
            .Where(i => i.CustomItemId.HasValue)
            .Select(i => i.CustomItemId!.Value)
            .Distinct()
            .ToList();

        var customItems = await db.CustomItems
            .Where(ci => customItemIds.Contains(ci.Id) && ci.AbilitiesJson != null)
            .ToDictionaryAsync(ci => ci.Id);

        var results = new List<EquipmentResourceDto>();

        foreach (var item in equippedItems)
        {
            if (!item.CustomItemId.HasValue) continue;
            if (!customItems.TryGetValue(item.CustomItemId.Value, out var ci)) continue;
            if (ci.AbilitiesJson is null) continue;

            var abilities = JsonSerializer.Deserialize<List<CustomItemAbilityDto>>(ci.AbilitiesJson) ?? [];

            foreach (var ability in abilities)
            {
                // Lazy-create usage row if it doesn't exist
                var usage = await db.EquipmentAbilityUsages.FirstOrDefaultAsync(u =>
                    u.InventoryItemId == item.Id && u.AbilityName == ability.Name);

                if (usage is null)
                {
                    usage = new EquipmentAbilityUsageEntity
                    {
                        InventoryItemId = item.Id,
                        AbilityName = ability.Name,
                        SpellIndex = ability.SpellIndex,
                        MaxUses = ability.MaxUses,
                        UsesRemaining = ability.MaxUses,
                        ResetOn = ability.ResetOn,
                    };
                    db.EquipmentAbilityUsages.Add(usage);
                }
                else
                {
                    // Sync max uses / reset in case item definition changed
                    usage.MaxUses = ability.MaxUses;
                    usage.SpellIndex = ability.SpellIndex;
                    usage.ResetOn = ability.ResetOn;
                    if (usage.UsesRemaining > usage.MaxUses) usage.UsesRemaining = usage.MaxUses;
                }

                results.Add(new EquipmentResourceDto
                {
                    Id = usage.Id,
                    InventoryItemId = item.Id,
                    ItemName = item.Name,
                    AbilityName = ability.Name,
                    SpellIndex = ability.SpellIndex,
                    MaxUses = ability.MaxUses,
                    UsesRemaining = usage.UsesRemaining,
                    ResetOn = ability.ResetOn,
                });
            }
        }

        await db.SaveChangesAsync();
        return Ok(results);
    }

    // POST api/characters/{id}/equipment-resources/{usageId}/use
    [HttpPost("{usageId:guid}/use")]
    public async Task<IActionResult> Use(Guid characterId, Guid usageId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var usage = await db.EquipmentAbilityUsages
            .Include(u => u.InventoryItem)
            .FirstOrDefaultAsync(u => u.Id == usageId && u.InventoryItem!.CharacterId == characterId);
        if (usage is null) return NotFound();

        if (usage.UsesRemaining > 0) usage.UsesRemaining--;
        await db.SaveChangesAsync();
        return Ok(new { usage.UsesRemaining });
    }

    // POST api/characters/{id}/equipment-resources/{usageId}/restore
    [HttpPost("{usageId:guid}/restore")]
    public async Task<IActionResult> Restore(Guid characterId, Guid usageId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var usage = await db.EquipmentAbilityUsages
            .Include(u => u.InventoryItem)
            .FirstOrDefaultAsync(u => u.Id == usageId && u.InventoryItem!.CharacterId == characterId);
        if (usage is null) return NotFound();

        if (usage.UsesRemaining < usage.MaxUses) usage.UsesRemaining++;
        await db.SaveChangesAsync();
        return Ok(new { usage.UsesRemaining });
    }

    // POST api/characters/{id}/equipment-resources/rest?type=short|long
    [HttpPost("rest")]
    public async Task<IActionResult> Rest(Guid characterId, [FromQuery] string type)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var inventoryItemIds = await db.InventoryItems
            .Where(i => i.CharacterId == characterId && i.IsEquipped)
            .Select(i => i.Id)
            .ToListAsync();

        var usages = await db.EquipmentAbilityUsages
            .Where(u => inventoryItemIds.Contains(u.InventoryItemId))
            .ToListAsync();

        foreach (var usage in usages)
        {
            bool shouldReset = type == "long" || (type == "short" && usage.ResetOn == "short_rest");
            if (shouldReset) usage.UsesRemaining = usage.MaxUses;
        }

        await db.SaveChangesAsync();
        return Ok();
    }
}
