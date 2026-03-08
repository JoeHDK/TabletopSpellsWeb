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
            IsNpc = req.IsNpc,
            Race = req.Race,
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
        if (req.BaseArmorClass.HasValue) entity.BaseArmorClass = req.BaseArmorClass.Value;
        if (req.SavingThrowProficiencies != null) entity.SavingThrowProficienciesJson = JsonConvert.SerializeObject(req.SavingThrowProficiencies);
        if (req.SkillProficiencies != null) entity.SkillProficienciesJson = JsonConvert.SerializeObject(req.SkillProficiencies);
        if (req.Race != null) entity.Race = req.Race;

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

    [HttpPost("{id:guid}/avatar")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<CharacterDto>> UploadAvatar(Guid id, IFormFile file)
    {
        var entity = await _db.Characters.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity == null) return NotFound();

        if (file.Length > 8_000_000)
            return BadRequest("Image must be under 8 MB.");

        // Read bytes and validate file signature (magic bytes) — ContentType is client-controlled and cannot be trusted
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        string? detectedMime = DetectImageMime(bytes);
        if (detectedMime == null)
            return BadRequest("File must be a valid JPEG, PNG, GIF, or WebP image.");

        entity.AvatarBase64 = $"data:{detectedMime};base64,{Convert.ToBase64String(bytes)}";
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(entity));
    }

    private static string? DetectImageMime(byte[] bytes)
    {
        if (bytes.Length < 4) return null;
        // JPEG: FF D8 FF
        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return "image/jpeg";
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.Length >= 8 &&
            bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
            bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A)
            return "image/png";
        // GIF: GIF87a or GIF89a
        if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46) return "image/gif";
        // WebP: RIFF????WEBP
        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
            return "image/webp";
        return null;
    }

    [HttpPatch("{id:guid}/hp")]    public async Task<IActionResult> UpdateHp(Guid id, [FromBody] UpdateHpRequest req)
    {
        var entity = await _db.Characters.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity == null) return NotFound();

        if (req.MaxHp.HasValue) entity.MaxHp = Math.Max(0, req.MaxHp.Value);
        entity.CurrentHp = Math.Clamp(req.CurrentHp, 0, entity.MaxHp > 0 ? entity.MaxHp : int.MaxValue);
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(entity));
    }

    [HttpPatch("{id:guid}/wildshape")]
    public async Task<IActionResult> UpdateWildShape(Guid id, [FromBody] WildShapeActionRequest req)
    {
        var entity = await _db.Characters.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity == null) return NotFound();

        switch (req.Action.ToLowerInvariant())
        {
            case "enter":
                if (entity.WildShapeUsesRemaining <= 0)
                    return BadRequest("No Wild Shape uses remaining.");
                if (string.IsNullOrWhiteSpace(req.BeastName) || req.BeastMaxHp == null)
                    return BadRequest("BeastName and BeastMaxHp are required to enter Wild Shape.");
                entity.WildShapeUsesRemaining--;
                entity.WildShapeBeastName = req.BeastName;
                entity.WildShapeBeastMaxHp = req.BeastMaxHp.Value;
                entity.WildShapeBeastCurrentHp = req.BeastCurrentHp ?? req.BeastMaxHp.Value;
                break;

            case "revert":
                // Carry excess damage to druid HP when reverting due to 0 beast HP
                if (entity.WildShapeBeastCurrentHp.HasValue && entity.WildShapeBeastCurrentHp.Value < 0)
                {
                    entity.CurrentHp = Math.Max(0, entity.CurrentHp + entity.WildShapeBeastCurrentHp.Value);
                }
                entity.WildShapeBeastName = null;
                entity.WildShapeBeastCurrentHp = null;
                entity.WildShapeBeastMaxHp = null;
                break;

            case "damage":
                if (req.Amount == null || req.Amount <= 0) return BadRequest("Amount must be positive.");
                if (entity.WildShapeBeastCurrentHp == null) return BadRequest("Not in Wild Shape.");
                entity.WildShapeBeastCurrentHp = entity.WildShapeBeastCurrentHp.Value - req.Amount.Value;
                // Auto-revert if beast HP reaches 0 or below
                if (entity.WildShapeBeastCurrentHp <= 0)
                {
                    var excess = entity.WildShapeBeastCurrentHp.Value; // negative
                    entity.CurrentHp = Math.Max(0, entity.CurrentHp + excess);
                    entity.WildShapeBeastName = null;
                    entity.WildShapeBeastCurrentHp = null;
                    entity.WildShapeBeastMaxHp = null;
                }
                break;

            case "heal":
                if (req.Amount == null || req.Amount <= 0) return BadRequest("Amount must be positive.");
                if (entity.WildShapeBeastCurrentHp == null || entity.WildShapeBeastMaxHp == null)
                    return BadRequest("Not in Wild Shape.");
                entity.WildShapeBeastCurrentHp = Math.Min(
                    entity.WildShapeBeastCurrentHp.Value + req.Amount.Value,
                    entity.WildShapeBeastMaxHp.Value);
                break;

            case "restoreuses":
                var maxUses = entity.Level >= 20 ? 999 : 2;
                entity.WildShapeUsesRemaining = req.Amount.HasValue
                    ? Math.Min(entity.WildShapeUsesRemaining + req.Amount.Value, maxUses)
                    : maxUses;
                break;

            default:
                return BadRequest($"Unknown action '{req.Action}'. Valid: enter, revert, damage, heal, restoreUses.");
        }

        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(entity));
    }

    private static List<string> DeserializeList(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        var trimmed = json.TrimStart();
        if (!trimmed.StartsWith('[')) return new();
        return JsonConvert.DeserializeObject<List<string>>(json) ?? new();
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
        AbilityScores = JsonConvert.DeserializeObject<Dictionary<string, int>>(e.AbilityScoresJson) ?? [],
        MaxSpellsPerDay = JsonConvert.DeserializeObject<Dictionary<int, int>>(e.MaxSpellsPerDayJson) ?? [],
        SpellsUsedToday = JsonConvert.DeserializeObject<Dictionary<int, int>>(e.SpellsUsedTodayJson) ?? [],
        AlwaysPreparedSpells = DeserializeList(e.AlwaysPreparedSpellsJson),
        SavingThrowProficiencies = DeserializeList(e.SavingThrowProficienciesJson),
        SkillProficiencies = DeserializeList(e.SkillProficienciesJson),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        MaxHp = e.MaxHp,
        CurrentHp = e.CurrentHp,
        BaseArmorClass = e.BaseArmorClass,
        GameRoomId = e.GameRoomId,
        AvatarBase64 = e.AvatarBase64,
        IsNpc = e.IsNpc,
        WildShapeUsesRemaining = e.WildShapeUsesRemaining,
        WildShapeBeastName = e.WildShapeBeastName,
        WildShapeBeastCurrentHp = e.WildShapeBeastCurrentHp,
        WildShapeBeastMaxHp = e.WildShapeBeastMaxHp,
        Race = e.Race,
    };
}
