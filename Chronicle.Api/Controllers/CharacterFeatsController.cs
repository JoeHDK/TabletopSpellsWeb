using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/characters/{characterId:guid}/feats")]
public class CharacterFeatsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FeatService _feats;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public CharacterFeatsController(AppDbContext db, FeatService feats)
    {
        _db = db;
        _feats = feats;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var charFeats = await _db.CharacterFeats
            .Where(f => f.CharacterId == characterId)
            .OrderBy(f => f.CreatedAt)
            .ToListAsync();

        var result = charFeats.Select(cf =>
        {
            var feat = cf.IsCustom ? null : _feats.GetFeat(cf.FeatIndex);
            return new
            {
                cf.Id,
                cf.FeatIndex,
                Name = cf.IsCustom ? (cf.CustomName ?? "Custom Feat") : (feat?.Name ?? cf.FeatIndex ?? "Unknown"),
                Desc = cf.IsCustom
                    ? (string.IsNullOrWhiteSpace(cf.CustomDescription) ? [] : [cf.CustomDescription])
                    : (feat?.Desc ?? []),
                Prerequisites = feat?.Prerequisites ?? [],
                Modifiers = feat?.Modifiers ?? [],
                cf.Notes,
                cf.TakenAtLevel,
                cf.CreatedAt,
                cf.IsCustom,
            };
        });

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Add(Guid characterId, [FromBody] AddCharacterFeatRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        if (req.IsCustom == true)
        {
            if (string.IsNullOrWhiteSpace(req.CustomName)) return BadRequest("Custom feat name is required.");
            var charFeat = new CharacterFeatEntity
            {
                CharacterId = characterId,
                FeatIndex = null,
                IsCustom = true,
                CustomName = req.CustomName.Trim(),
                CustomDescription = req.CustomDescription?.Trim(),
            };
            _db.CharacterFeats.Add(charFeat);
            await _db.SaveChangesAsync();
            return Ok(new
            {
                charFeat.Id,
                FeatIndex = "custom",
                Name = charFeat.CustomName,
                Desc = string.IsNullOrWhiteSpace(charFeat.CustomDescription) ? [] : new[] { charFeat.CustomDescription },
                Prerequisites = Array.Empty<object>(),
                Modifiers = Array.Empty<object>(),
                charFeat.Notes,
                charFeat.TakenAtLevel,
                charFeat.CreatedAt,
                IsCustom = true,
            });
        }

        if (string.IsNullOrWhiteSpace(req.FeatIndex)) return BadRequest("FeatIndex is required.");
        var feat = _feats.GetFeat(req.FeatIndex);
        if (feat is null) return BadRequest("Unknown feat index.");

        var alreadyHas = await _db.CharacterFeats
            .AnyAsync(f => f.CharacterId == characterId && f.FeatIndex == req.FeatIndex && !f.IsCustom);
        if (alreadyHas && req.FeatIndex != "ability-score-improvement")
            return Conflict("Character already has this feat.");

        var entity = new CharacterFeatEntity
        {
            CharacterId = characterId,
            FeatIndex = req.FeatIndex,
            Notes = req.Notes,
            TakenAtLevel = req.TakenAtLevel,
        };

        _db.CharacterFeats.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            entity.Id,
            entity.FeatIndex,
            Name = feat.Name,
            Desc = feat.Desc,
            Prerequisites = feat.Prerequisites,
            Modifiers = feat.Modifiers,
            entity.Notes,
            entity.TakenAtLevel,
            entity.CreatedAt,
            IsCustom = false,
        });
    }

    [HttpDelete("{featId:guid}")]
    public async Task<IActionResult> Remove(Guid characterId, Guid featId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var charFeat = await _db.CharacterFeats
            .FirstOrDefaultAsync(f => f.Id == featId && f.CharacterId == characterId);
        if (charFeat is null) return NotFound();

        _db.CharacterFeats.Remove(charFeat);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);
}

public class AddCharacterFeatRequest
{
    public string? FeatIndex { get; set; }
    public string? Notes { get; set; }
    public int? TakenAtLevel { get; set; }
    public bool? IsCustom { get; set; }
    public string? CustomName { get; set; }
    public string? CustomDescription { get; set; }
}
