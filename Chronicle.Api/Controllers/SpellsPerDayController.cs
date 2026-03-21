using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/characters/{characterId:guid}/spellsperday")]
public class SpellsPerDayController : ControllerBase
{
    private readonly AppDbContext _db;
    public SpellsPerDayController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    [HttpGet]
    public async Task<ActionResult<List<SpellsPerDayDto>>> GetToday(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var items = await _db.SpellsPerDay
            .Where(s => s.CharacterId == characterId && s.Date == today)
            .ToListAsync();
        return Ok(items.Select(MapToDto));
    }

    [HttpPut("{spellLevel:int}")]
    public async Task<ActionResult<SpellsPerDayDto>> Upsert(Guid characterId, int spellLevel, UpsertSpellsPerDayRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var existing = await _db.SpellsPerDay.FirstOrDefaultAsync(s =>
            s.CharacterId == characterId && s.SpellLevel == spellLevel && s.Date == today);

        if (existing != null)
        {
            existing.MaxSlots = req.MaxSlots;
            existing.UsedSlots = req.UsedSlots;
        }
        else
        {
            existing = new SpellsPerDayEntity
            {
                CharacterId = characterId,
                SpellLevel = req.SpellLevel,
                MaxSlots = req.MaxSlots,
                UsedSlots = req.UsedSlots,
                Date = today,
            };
            _db.SpellsPerDay.Add(existing);
        }

        await _db.SaveChangesAsync();
        return Ok(MapToDto(existing));
    }

    private static SpellsPerDayDto MapToDto(SpellsPerDayEntity e) => new()
    {
        Id = e.Id, SpellLevel = e.SpellLevel, MaxSlots = e.MaxSlots,
        UsedSlots = e.UsedSlots, Date = e.Date,
    };
}
