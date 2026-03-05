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
[Route("api/characters/{characterId:guid}/preparedspells")]
public class PreparedSpellsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PreparedSpellsController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    [HttpGet]
    public async Task<ActionResult<List<PreparedSpellDto>>> GetAll(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();
        var items = await _db.PreparedSpells.Where(p => p.CharacterId == characterId).ToListAsync();
        return Ok(items.Select(MapToDto));
    }

    [HttpPut("{spellId}")]
    public async Task<ActionResult<PreparedSpellDto>> Upsert(Guid characterId, string spellId, UpsertPreparedSpellRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var existing = await _db.PreparedSpells.FirstOrDefaultAsync(p => p.CharacterId == characterId && p.SpellId == spellId);
        if (existing != null)
        {
            existing.IsPrepared = req.IsPrepared;
            existing.IsAlwaysPrepared = req.IsAlwaysPrepared;
            existing.IsFavorite = req.IsFavorite;
            existing.IsDomainSpell = req.IsDomainSpell;
        }
        else
        {
            existing = new PreparedSpellEntity
            {
                CharacterId = characterId,
                SpellId = req.SpellId,
                IsPrepared = req.IsPrepared,
                IsAlwaysPrepared = req.IsAlwaysPrepared,
                IsFavorite = req.IsFavorite,
                IsDomainSpell = req.IsDomainSpell,
            };
            _db.PreparedSpells.Add(existing);
        }

        await _db.SaveChangesAsync();
        return Ok(MapToDto(existing));
    }

    [HttpDelete("{spellId}")]
    public async Task<IActionResult> Delete(Guid characterId, string spellId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();
        var item = await _db.PreparedSpells.FirstOrDefaultAsync(p => p.CharacterId == characterId && p.SpellId == spellId);
        if (item == null) return NotFound();
        _db.PreparedSpells.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static PreparedSpellDto MapToDto(PreparedSpellEntity e) => new()
    {
        Id = e.Id, SpellId = e.SpellId, IsPrepared = e.IsPrepared,
        IsAlwaysPrepared = e.IsAlwaysPrepared, IsFavorite = e.IsFavorite, IsDomainSpell = e.IsDomainSpell,
    };
}
