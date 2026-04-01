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
[Route("api/characters/{characterId:guid}/spelllogs")]
public class SpellLogsController : ControllerBase
{
    private readonly AppDbContext _db;
    public SpellLogsController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    [HttpGet]
    public async Task<ActionResult<List<SpellCastLogDto>>> GetAll(Guid characterId, [FromQuery] int? sessionId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();
        var query = _db.SpellCastLogs.Where(l => l.CharacterId == characterId);
        if (sessionId.HasValue) query = query.Where(l => l.SessionId == sessionId.Value);
        var items = await query.OrderByDescending(l => l.CastTime).ToListAsync();
        return Ok(items.Select(MapToDto));
    }

    [HttpPost]
    public async Task<ActionResult<SpellCastLogDto>> Create(Guid characterId, CreateSpellCastLogRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var entity = new SpellCastLogEntity
        {
            CharacterId = characterId,
            SpellName = req.SpellName,
            SpellLevel = req.SpellLevel,
            CastAsRitual = req.CastAsRitual,
            Success = req.Success,
            Reason = req.Reason,
            FailedReason = req.FailedReason,
            SessionId = req.SessionId,
        };

        _db.SpellCastLogs.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(MapToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid characterId, Guid id)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();
        var item = await _db.SpellCastLogs.FirstOrDefaultAsync(l => l.Id == id && l.CharacterId == characterId);
        if (item == null) return NotFound();
        _db.SpellCastLogs.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static SpellCastLogDto MapToDto(SpellCastLogEntity e) => new()
    {
        Id = e.Id, SpellName = e.SpellName, SpellLevel = e.SpellLevel, CastTime = e.CastTime,
        CastAsRitual = e.CastAsRitual, Success = e.Success, Reason = e.Reason,
        FailedReason = e.FailedReason, SessionId = e.SessionId,
    };
}
