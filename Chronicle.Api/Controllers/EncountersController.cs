using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Hubs;
using Chronicle.Api.Models.Enums;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/game-rooms/{gameRoomId}/encounter")]
[Authorize]
public class EncountersController(AppDbContext db, IHubContext<EncounterHub> hub, MonsterService monsters) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> IsMember(Guid gameRoomId) =>
        await db.GameMembers.AnyAsync(m => m.GameRoomId == gameRoomId && m.UserId == UserId);

    private async Task<bool> IsDm(Guid gameRoomId) =>
        await db.GameMembers.AnyAsync(m => m.GameRoomId == gameRoomId && m.UserId == UserId && m.Role == GameRole.DM);

    // GET /api/game-rooms/{gameRoomId}/encounter
    [HttpGet]
    public async Task<IActionResult> Get(Guid gameRoomId)
    {
        if (!await IsMember(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);

        if (encounter == null) return Ok(null);
        return Ok(ToDto(encounter));
    }

    // POST /api/game-rooms/{gameRoomId}/encounter
    [HttpPost]
    public async Task<IActionResult> Create(Guid gameRoomId, [FromBody] CreateEncounterRequest request)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var existing = await db.Encounters.FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (existing != null)
            return Conflict("An active encounter already exists for this game room.");

        var encounter = new EncounterEntity
        {
            GameRoomId = gameRoomId,
            Name = request.Name,
        };
        db.Encounters.Add(encounter);
        await db.SaveChangesAsync();

        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return CreatedAtAction(nameof(Get), new { gameRoomId }, dto);
    }

    // DELETE /api/game-rooms/{gameRoomId}/encounter
    [HttpDelete]
    public async Task<IActionResult> Delete(Guid gameRoomId)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound();

        encounter.IsActive = false;
        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", null);
        return NoContent();
    }

    // POST /api/game-rooms/{gameRoomId}/encounter/creatures
    [HttpPost("creatures")]
    public async Task<IActionResult> AddCreature(Guid gameRoomId, [FromBody] AddEncounterCreatureRequest request)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound("No active encounter.");

        var sortOrder = encounter.Creatures.Any() ? encounter.Creatures.Max(c => c.SortOrder) + 1 : 0;
        var creature = new EncounterCreatureEntity
        {
            EncounterId = encounter.Id,
            DisplayName = request.DisplayName,
            MonsterName = request.MonsterName,
            MaxHp = request.MaxHp,
            CurrentHp = request.MaxHp,
            ArmorClass = request.ArmorClass,
            Initiative = request.Initiative,
            SortOrder = sortOrder,
            IsPlayerCharacter = request.IsPlayerCharacter,
            CharacterId = request.CharacterId,
            Notes = request.Notes,
        };
        db.EncounterCreatures.Add(creature);
        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return Ok(CreatureToDto(creature));
    }

    // DELETE /api/game-rooms/{gameRoomId}/encounter/creatures/{creatureId}
    [HttpDelete("creatures/{creatureId:guid}")]
    public async Task<IActionResult> RemoveCreature(Guid gameRoomId, Guid creatureId)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound("No active encounter.");

        var creature = encounter.Creatures.FirstOrDefault(c => c.Id == creatureId);
        if (creature == null) return NotFound();

        db.EncounterCreatures.Remove(creature);
        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return NoContent();
    }

    // PATCH /api/game-rooms/{gameRoomId}/encounter/creatures/{creatureId}
    [HttpPatch("creatures/{creatureId:guid}")]
    public async Task<IActionResult> UpdateCreature(Guid gameRoomId, Guid creatureId, [FromBody] UpdateEncounterCreatureRequest request)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound("No active encounter.");

        var creature = encounter.Creatures.FirstOrDefault(c => c.Id == creatureId);
        if (creature == null) return NotFound();

        if (request.CurrentHp.HasValue) creature.CurrentHp = request.CurrentHp.Value;
        if (request.MaxHp.HasValue) { creature.MaxHp = request.MaxHp.Value; }
        if (request.Initiative.HasValue)
        {
            creature.Initiative = request.Initiative.Value;
            ApplyInitiativeOrder(encounter);
        }
        if (request.SortOrder.HasValue) creature.SortOrder = request.SortOrder.Value;
        if (request.Notes != null) creature.Notes = request.Notes;

        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return Ok(CreatureToDto(creature));
    }

    // PUT /api/game-rooms/{gameRoomId}/encounter/next-turn
    [HttpPut("next-turn")]
    public async Task<IActionResult> NextTurn(Guid gameRoomId)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound("No active encounter.");

        var creatureCount = encounter.Creatures.Count;
        if (creatureCount == 0) return BadRequest("No creatures in encounter.");

        encounter.ActiveCreatureIndex = (encounter.ActiveCreatureIndex + 1) % creatureCount;
        if (encounter.ActiveCreatureIndex == 0)
            encounter.RoundNumber++;

        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return Ok(dto);
    }

    // POST /api/game-rooms/{gameRoomId}/encounter/add-players
    [HttpPost("add-players")]
    public async Task<IActionResult> AddPlayers(Guid gameRoomId, [FromBody] AddPlayersRequest request)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound("No active encounter.");

        var characters = await db.Characters
            .Where(c => request.CharacterIds.Contains(c.Id) && c.GameRoomId == gameRoomId)
            .ToListAsync();

        var alreadyAdded = encounter.Creatures
            .Where(c => c.CharacterId.HasValue)
            .Select(c => c.CharacterId!.Value)
            .ToHashSet();

        var sortOrder = encounter.Creatures.Any() ? encounter.Creatures.Max(c => c.SortOrder) + 1 : 0;
        foreach (var ch in characters)
        {
            if (alreadyAdded.Contains(ch.Id)) continue;
            db.EncounterCreatures.Add(new EncounterCreatureEntity
            {
                EncounterId = encounter.Id,
                DisplayName = ch.Name,
                MaxHp = ch.MaxHp > 0 ? ch.MaxHp : 10,
                CurrentHp = ch.CurrentHp > 0 ? ch.CurrentHp : (ch.MaxHp > 0 ? ch.MaxHp : 10),
                ArmorClass = 10 + ch.BaseArmorClass,
                IsPlayerCharacter = true,
                CharacterId = ch.Id,
                SortOrder = sortOrder++,
            });
        }
        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Reload with updated creatures
        await db.Entry(encounter).Collection(e => e.Creatures).LoadAsync();
        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return Ok(dto);
    }

    // POST /api/game-rooms/{gameRoomId}/encounter/roll-initiative
    [HttpPost("roll-initiative")]
    public async Task<IActionResult> RollInitiative(Guid gameRoomId)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound("No active encounter.");

        // Group non-player creatures by MonsterName for shared initiative
        var monsterCreatures = encounter.Creatures
            .Where(c => !c.IsPlayerCharacter)
            .GroupBy(c => c.MonsterName ?? $"__custom_{c.Id}");

        foreach (var group in monsterCreatures)
        {
            int dexMod = 0;
            if (group.Key != null && !group.Key.StartsWith("__custom_"))
            {
                var monster = monsters.GetMonster(group.Key);
                if (monster != null)
                    dexMod = (monster.Dex - 10) / 2;
            }
            int roll = Random.Shared.Next(1, 21) + dexMod;
            foreach (var creature in group)
                creature.Initiative = roll;
        }

        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Auto-sort by initiative after rolling
        ApplyInitiativeOrder(encounter);
        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return Ok(dto);
    }

    // POST /api/game-rooms/{gameRoomId}/encounter/sort-by-initiative (kept for compatibility)
    [HttpPost("sort-by-initiative")]
    public async Task<IActionResult> SortByInitiative(Guid gameRoomId)
    {
        if (!await IsDm(gameRoomId)) return Forbid();

        var encounter = await db.Encounters
            .Include(e => e.Creatures)
            .FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (encounter == null) return NotFound("No active encounter.");

        ApplyInitiativeOrder(encounter);
        encounter.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var dto = ToDto(encounter);
        await hub.Clients.Group($"encounter:{gameRoomId}").SendAsync("EncounterUpdated", dto);
        return Ok(dto);
    }

    private static void ApplyInitiativeOrder(EncounterEntity encounter)
    {
        var sorted = encounter.Creatures
            .OrderByDescending(c => c.Initiative.HasValue)
            .ThenByDescending(c => c.Initiative ?? int.MinValue)
            .ThenBy(c => c.DisplayName)
            .ToList();
        for (int i = 0; i < sorted.Count; i++)
            sorted[i].SortOrder = i;
    }

    private static EncounterDto ToDto(EncounterEntity e) => new()
    {
        Id = e.Id,
        GameRoomId = e.GameRoomId,
        Name = e.Name,
        IsActive = e.IsActive,
        RoundNumber = e.RoundNumber,
        ActiveCreatureIndex = e.ActiveCreatureIndex,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        Creatures = e.Creatures.OrderBy(c => c.SortOrder).Select(CreatureToDto).ToList(),
    };

    private static EncounterCreatureDto CreatureToDto(EncounterCreatureEntity c) => new()
    {
        Id = c.Id,
        DisplayName = c.DisplayName,
        MonsterName = c.MonsterName,
        MaxHp = c.MaxHp,
        CurrentHp = c.CurrentHp,
        ArmorClass = c.ArmorClass,
        Initiative = c.Initiative,
        SortOrder = c.SortOrder,
        IsPlayerCharacter = c.IsPlayerCharacter,
        CharacterId = c.CharacterId,
        Notes = c.Notes,
    };
}
