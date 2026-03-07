using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using TabletopSpells.Api.Data;
using TabletopSpells.Api.Data.Entities;
using TabletopSpells.Api.DTOs;
using TabletopSpells.Api.Helpers;

namespace TabletopSpells.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CharactersController : ControllerBase
{
    private readonly AppDbContext _db;
    public CharactersController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<List<CharacterDto>>> GetAll()
    {
        var chars = await _db.Characters.Where(c => c.UserId == UserId).ToListAsync();
        return Ok(chars.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CharacterDto>> Get(Guid id)
    {
        var c = await _db.Characters.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        return c == null ? NotFound() : Ok(MapToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<CharacterDto>> Create(CreateCharacterRequest req)
    {
        var defaultScores = new Dictionary<string, int>
        {
            ["Strength"] = 10, ["Dexterity"] = 10, ["Constitution"] = 10,
            ["Intelligence"] = 10, ["Wisdom"] = 10, ["Charisma"] = 10
        };
        var scores = req.AbilityScores ?? defaultScores;

        var entity = new CharacterEntity
        {
            UserId = UserId,
            Name = req.Name,
            CharacterClass = req.CharacterClass,
            Subclass = req.Subclass,
            GameType = req.GameType,
            Level = req.Level,
            IsDivineCaster = ClassHelper.IsDivineCaster(req.CharacterClass),
            AbilityScoresJson = JsonConvert.SerializeObject(scores),
        };

        _db.Characters.Add(entity);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, MapToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CharacterDto>> Update(Guid id, UpdateCharacterRequest req)
    {
        var entity = await _db.Characters.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity == null) return NotFound();

        if (req.Name != null) entity.Name = req.Name;
        if (req.Level.HasValue) entity.Level = req.Level.Value;
        if (req.Subclass.HasValue) entity.Subclass = req.Subclass.Value;
        if (req.AbilityScores != null) entity.AbilityScoresJson = JsonConvert.SerializeObject(req.AbilityScores);
        if (req.MaxSpellsPerDay != null) entity.MaxSpellsPerDayJson = JsonConvert.SerializeObject(req.MaxSpellsPerDay);
        if (req.SpellsUsedToday != null) entity.SpellsUsedTodayJson = JsonConvert.SerializeObject(req.SpellsUsedToday);

        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _db.Characters.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity == null) return NotFound();
        _db.Characters.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/hp")]
    public async Task<IActionResult> UpdateHp(Guid id, [FromBody] UpdateHpRequest req)
    {
        var entity = await _db.Characters.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity == null) return NotFound();

        entity.CurrentHp = Math.Clamp(req.CurrentHp, 0, entity.MaxHp > 0 ? entity.MaxHp : int.MaxValue);
        if (req.MaxHp.HasValue) entity.MaxHp = Math.Max(0, req.MaxHp.Value);
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(entity));
    }

    private static CharacterDto MapToDto(CharacterEntity e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        CharacterClass = e.CharacterClass,
        Subclass = e.Subclass,
        GameType = e.GameType,
        Level = e.Level,
        IsDivineCaster = e.IsDivineCaster,
        AbilityScores = JsonConvert.DeserializeObject<Dictionary<string, int>>(e.AbilityScoresJson) ?? new(),
        MaxSpellsPerDay = JsonConvert.DeserializeObject<Dictionary<int, int>>(e.MaxSpellsPerDayJson) ?? new(),
        SpellsUsedToday = JsonConvert.DeserializeObject<Dictionary<int, int>>(e.SpellsUsedTodayJson) ?? new(),
        AlwaysPreparedSpells = JsonConvert.DeserializeObject<List<string>>(e.AlwaysPreparedSpellsJson) ?? new(),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        MaxHp = e.MaxHp,
        CurrentHp = e.CurrentHp,
        BaseArmorClass = e.BaseArmorClass,
        GameRoomId = e.GameRoomId,
    };
}
