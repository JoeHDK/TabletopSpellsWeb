using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/characters/{characterId:guid}/resources")]
public class ClassResourcesController(AppDbContext db, ClassResourceSeedService seedService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    // GET /api/characters/{id}/resources
    [HttpGet]
    public async Task<ActionResult<List<ClassResourceDto>>> GetAll(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var resources = await db.ClassResources
            .Where(r => r.CharacterId == characterId)
            .OrderBy(r => r.Name)
            .ToListAsync();

        return Ok(resources.Select(MapToDto));
    }

    // PUT /api/characters/{id}/resources/{key}
    [HttpPut("{key}")]
    public async Task<ActionResult<ClassResourceDto>> Upsert(Guid characterId, string key, UpsertClassResourceRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var existing = await db.ClassResources
            .FirstOrDefaultAsync(r => r.CharacterId == characterId && r.ResourceKey == key);

        if (existing != null)
        {
            var oldMax = existing.MaxUses;
            existing.Name = req.Name;
            existing.MaxUses = req.MaxUses;
            existing.ResetOn = req.ResetOn;
            existing.IsHpPool = req.IsHpPool;
            // Clamp remaining to new max; if max increased, restore the difference
            if (req.MaxUses > oldMax)
                existing.UsesRemaining = Math.Min(existing.UsesRemaining + (req.MaxUses - oldMax), req.MaxUses);
            else
                existing.UsesRemaining = Math.Min(existing.UsesRemaining, req.MaxUses);
        }
        else
        {
            existing = new ClassResourceEntity
            {
                CharacterId = characterId,
                ResourceKey = key,
                Name = req.Name,
                MaxUses = req.MaxUses,
                UsesRemaining = req.MaxUses, // start full
                ResetOn = req.ResetOn,
                IsHpPool = req.IsHpPool,
            };
            db.ClassResources.Add(existing);
        }

        await db.SaveChangesAsync();
        return Ok(MapToDto(existing));
    }

    // POST /api/characters/{id}/resources/{key}/use
    [HttpPost("{key}/use")]
    public async Task<ActionResult<ClassResourceDto>> Use(Guid characterId, string key, [FromBody] UseClassResourceRequest? req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var resource = await db.ClassResources
            .FirstOrDefaultAsync(r => r.CharacterId == characterId && r.ResourceKey == key);

        if (resource == null) return NotFound();

        int amount = req?.Amount ?? 1;
        if (resource.UsesRemaining < amount)
            return BadRequest("Not enough uses remaining.");

        resource.UsesRemaining -= amount;
        await db.SaveChangesAsync();
        return Ok(MapToDto(resource));
    }

    // POST /api/characters/{id}/resources/{key}/restore
    [HttpPost("{key}/restore")]
    public async Task<ActionResult<ClassResourceDto>> Restore(Guid characterId, string key, [FromBody] UseClassResourceRequest? req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var resource = await db.ClassResources
            .FirstOrDefaultAsync(r => r.CharacterId == characterId && r.ResourceKey == key);

        if (resource == null) return NotFound();

        int amount = req?.Amount ?? 1;
        resource.UsesRemaining = Math.Min(resource.UsesRemaining + amount, resource.MaxUses);
        await db.SaveChangesAsync();
        return Ok(MapToDto(resource));
    }

    // POST /api/characters/{id}/resources/long-rest — reset all resources
    [HttpPost("long-rest")]
    public async Task<ActionResult<List<ClassResourceDto>>> LongRest(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var resources = await db.ClassResources
            .Where(r => r.CharacterId == characterId)
            .ToListAsync();

        foreach (var r in resources)
            r.UsesRemaining = r.MaxUses;

        await db.SaveChangesAsync();
        return Ok(resources.Select(MapToDto));
    }

    // POST /api/characters/{id}/resources/short-rest — reset only short_rest resources
    [HttpPost("short-rest")]
    public async Task<ActionResult<List<ClassResourceDto>>> ShortRest(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var resources = await db.ClassResources
            .Where(r => r.CharacterId == characterId)
            .ToListAsync();

        foreach (var r in resources.Where(r => r.ResetOn == "short_rest"))
            r.UsesRemaining = r.MaxUses;

        await db.SaveChangesAsync();
        return Ok(resources.Select(MapToDto));
    }

    // POST /api/characters/{id}/resources/sync — auto-create/update resources based on class+level
    [HttpPost("sync")]
    public async Task<ActionResult<List<ClassResourceDto>>> Sync(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var character = await db.Characters.FindAsync(characterId);
        if (character == null) return NotFound();

        var abilityScores = JsonConvert.DeserializeObject<Dictionary<string, int>>(character.AbilityScoresJson) ?? [];
        var expected = seedService.GetExpectedResources(character.CharacterClass, character.Level, abilityScores);

        foreach (var req in expected)
        {
            var existing = await db.ClassResources
                .FirstOrDefaultAsync(r => r.CharacterId == characterId && r.ResourceKey == req.ResourceKey);

            if (existing == null)
            {
                db.ClassResources.Add(new ClassResourceEntity
                {
                    CharacterId = characterId,
                    ResourceKey = req.ResourceKey,
                    Name = req.Name,
                    MaxUses = req.MaxUses,
                    UsesRemaining = req.MaxUses,
                    ResetOn = req.ResetOn,
                    IsHpPool = req.IsHpPool,
                });
            }
            else if (existing.MaxUses != req.MaxUses || existing.Name != req.Name || existing.ResetOn != req.ResetOn)
            {
                var oldMax = existing.MaxUses;
                existing.Name = req.Name;
                existing.ResetOn = req.ResetOn;
                existing.IsHpPool = req.IsHpPool;
                // Scale remaining proportionally on max change
                if (req.MaxUses != oldMax && oldMax > 0)
                    existing.UsesRemaining = (int)Math.Round((double)existing.UsesRemaining / oldMax * req.MaxUses);
                existing.MaxUses = req.MaxUses;
                existing.UsesRemaining = Math.Clamp(existing.UsesRemaining, 0, req.MaxUses);
            }
        }

        // Remove any resources that no longer belong to the current class/level
        var expectedKeys = expected.Select(r => r.ResourceKey).ToHashSet();
        var stale = await db.ClassResources
            .Where(r => r.CharacterId == characterId && !expectedKeys.Contains(r.ResourceKey))
            .ToListAsync();
        if (stale.Count > 0)
            db.ClassResources.RemoveRange(stale);

        await db.SaveChangesAsync();

        var all = await db.ClassResources
            .Where(r => r.CharacterId == characterId)
            .OrderBy(r => r.Name)
            .ToListAsync();

        return Ok(all.Select(MapToDto));
    }

    private static ClassResourceDto MapToDto(ClassResourceEntity e) => new()
    {
        Id = e.Id,
        ResourceKey = e.ResourceKey,
        Name = e.Name,
        MaxUses = e.MaxUses,
        UsesRemaining = e.UsesRemaining,
        ResetOn = e.ResetOn,
        IsHpPool = e.IsHpPool,
    };
}
