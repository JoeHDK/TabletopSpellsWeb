using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/game-rooms/{gameRoomId}/planner/templates")]
[Authorize]
public class EncounterTemplatesController(AppDbContext db, IGameAuthorizationService authService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/game-rooms/{gameRoomId}/planner/templates
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid gameRoomId)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var templates = await db.EncounterTemplates
            .Include(t => t.Creatures)
            .Where(t => t.GameRoomId == gameRoomId)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();

        return Ok(templates.Select(ToDto));
    }

    // POST /api/game-rooms/{gameRoomId}/planner/templates
    [HttpPost]
    public async Task<IActionResult> Create(Guid gameRoomId, [FromBody] CreateEncounterTemplateRequest request)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var template = new EncounterTemplateEntity
        {
            GameRoomId = gameRoomId,
            Name = request.Name,
            SessionNoteId = request.SessionId,
        };
        db.EncounterTemplates.Add(template);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { gameRoomId }, ToDto(template));
    }

    // PUT /api/game-rooms/{gameRoomId}/planner/templates/{templateId}
    [HttpPut("{templateId:guid}")]
    public async Task<IActionResult> Update(Guid gameRoomId, Guid templateId, [FromBody] UpdateEncounterTemplateRequest request)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var template = await db.EncounterTemplates
            .Include(t => t.Creatures)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.GameRoomId == gameRoomId);
        if (template == null) return NotFound();

        template.Name = request.Name;
        if (request.UnlinkSession)
            template.SessionNoteId = null;
        else if (request.SessionId.HasValue)
            template.SessionNoteId = request.SessionId;
        template.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(template));
    }

    // DELETE /api/game-rooms/{gameRoomId}/planner/templates/{templateId}
    [HttpDelete("{templateId:guid}")]
    public async Task<IActionResult> Delete(Guid gameRoomId, Guid templateId)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var template = await db.EncounterTemplates.FirstOrDefaultAsync(t => t.Id == templateId && t.GameRoomId == gameRoomId);
        if (template == null) return NotFound();

        db.EncounterTemplates.Remove(template);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/game-rooms/{gameRoomId}/planner/templates/{templateId}/creatures
    [HttpPost("{templateId:guid}/creatures")]
    public async Task<IActionResult> AddCreature(Guid gameRoomId, Guid templateId, [FromBody] AddTemplateCreatureRequest request)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var template = await db.EncounterTemplates
            .Include(t => t.Creatures)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.GameRoomId == gameRoomId);
        if (template == null) return NotFound();

        var sortOrder = template.Creatures.Any() ? template.Creatures.Max(c => c.SortOrder) + 1 : 0;
        var creature = new EncounterTemplateCreatureEntity
        {
            TemplateId = templateId,
            DisplayName = request.DisplayName,
            MonsterName = request.MonsterName,
            MaxHp = request.MaxHp,
            ArmorClass = request.ArmorClass,
            SortOrder = sortOrder,
            Notes = request.Notes,
        };
        db.EncounterTemplateCreatures.Add(creature);
        template.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(template));
    }

    // PUT /api/game-rooms/{gameRoomId}/planner/templates/{templateId}/creatures/{creatureId}
    [HttpPut("{templateId:guid}/creatures/{creatureId:guid}")]
    public async Task<IActionResult> UpdateCreature(Guid gameRoomId, Guid templateId, Guid creatureId, [FromBody] UpdateTemplateCreatureRequest request)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var template = await db.EncounterTemplates
            .Include(t => t.Creatures)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.GameRoomId == gameRoomId);
        if (template == null) return NotFound();

        var creature = template.Creatures.FirstOrDefault(c => c.Id == creatureId);
        if (creature == null) return NotFound();

        creature.DisplayName = request.DisplayName;
        creature.MaxHp = request.MaxHp;
        creature.ArmorClass = request.ArmorClass;
        creature.Notes = request.Notes;
        template.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(template));
    }

    // DELETE /api/game-rooms/{gameRoomId}/planner/templates/{templateId}/creatures/{creatureId}
    [HttpDelete("{templateId:guid}/creatures/{creatureId:guid}")]
    public async Task<IActionResult> RemoveCreature(Guid gameRoomId, Guid templateId, Guid creatureId)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var template = await db.EncounterTemplates
            .Include(t => t.Creatures)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.GameRoomId == gameRoomId);
        if (template == null) return NotFound();

        var creature = template.Creatures.FirstOrDefault(c => c.Id == creatureId);
        if (creature == null) return NotFound();

        db.EncounterTemplateCreatures.Remove(creature);
        template.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(template));
    }

    // POST /api/game-rooms/{gameRoomId}/planner/templates/{templateId}/launch
    [HttpPost("{templateId:guid}/launch")]
    public async Task<IActionResult> Launch(Guid gameRoomId, Guid templateId)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var template = await db.EncounterTemplates
            .Include(t => t.Creatures)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.GameRoomId == gameRoomId);
        if (template == null) return NotFound();

        // End any existing active encounter
        var existing = await db.Encounters.FirstOrDefaultAsync(e => e.GameRoomId == gameRoomId && e.IsActive);
        if (existing != null)
        {
            existing.IsActive = false;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        // Create new encounter from template — pre-generate Id so creatures can reference it
        // without a separate SaveChangesAsync round-trip
        var encounter = new EncounterEntity
        {
            Id = Guid.NewGuid(),
            GameRoomId = gameRoomId,
            Name = template.Name,
        };
        db.Encounters.Add(encounter);

        var creatures = template.Creatures.OrderBy(c => c.SortOrder).Select((c, idx) => new EncounterCreatureEntity
        {
            EncounterId = encounter.Id,
            DisplayName = c.DisplayName,
            MonsterName = c.MonsterName,
            MaxHp = c.MaxHp,
            CurrentHp = c.MaxHp,
            ArmorClass = c.ArmorClass,
            SortOrder = idx,
            Notes = c.Notes,
        }).ToList();

        db.EncounterCreatures.AddRange(creatures);
        await db.SaveChangesAsync();

        encounter.Creatures = creatures;
        return Ok(new EncounterDto
        {
            Id = encounter.Id,
            GameRoomId = encounter.GameRoomId,
            Name = encounter.Name,
            IsActive = encounter.IsActive,
            RoundNumber = encounter.RoundNumber,
            ActiveCreatureIndex = encounter.ActiveCreatureIndex,
            CreatedAt = encounter.CreatedAt,
            UpdatedAt = encounter.UpdatedAt,
            Creatures = creatures.Select(c => new EncounterCreatureDto
            {
                Id = c.Id,
                DisplayName = c.DisplayName,
                MonsterName = c.MonsterName,
                MaxHp = c.MaxHp,
                CurrentHp = c.CurrentHp,
                ArmorClass = c.ArmorClass,
                SortOrder = c.SortOrder,
                Notes = c.Notes,
            }).ToList(),
        });
    }

    private static EncounterTemplateDto ToDto(EncounterTemplateEntity t) => new()
    {
        Id = t.Id,
        GameRoomId = t.GameRoomId,
        Name = t.Name,
        SessionId = t.SessionNoteId,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,
        Creatures = t.Creatures.OrderBy(c => c.SortOrder).Select(c => new EncounterTemplateCreatureDto
        {
            Id = c.Id,
            DisplayName = c.DisplayName,
            MonsterName = c.MonsterName,
            MaxHp = c.MaxHp,
            ArmorClass = c.ArmorClass,
            SortOrder = c.SortOrder,
            Notes = c.Notes,
        }).ToList(),
    };
}

