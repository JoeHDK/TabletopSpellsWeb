using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/characters/{characterId:guid}/themes")]
public class ThemesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ThemesController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    [HttpGet]
    public async Task<ActionResult<List<CharacterThemeDto>>> GetAll(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();
        var items = await _db.CharacterThemes.Where(t => t.CharacterId == characterId).ToListAsync();
        return Ok(items.Select(MapToDto));
    }

    [HttpPut("{themeName}")]
    public async Task<ActionResult<CharacterThemeDto>> Upsert(Guid characterId, string themeName, UpsertThemeRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var existing = await _db.CharacterThemes.FirstOrDefaultAsync(t =>
            t.CharacterId == characterId && t.ThemeName == themeName);

        if (existing != null)
        {
            existing.ThemeName = req.ThemeName;
            existing.CustomColorsJson = JsonConvert.SerializeObject(req.CustomColors ?? new Dictionary<string, string>());
        }
        else
        {
            existing = new CharacterThemeEntity
            {
                CharacterId = characterId,
                ThemeName = req.ThemeName,
                CustomColorsJson = JsonConvert.SerializeObject(req.CustomColors ?? new Dictionary<string, string>()),
            };
            _db.CharacterThemes.Add(existing);
        }

        await _db.SaveChangesAsync();
        return Ok(MapToDto(existing));
    }

    private static CharacterThemeDto MapToDto(CharacterThemeEntity e) => new()
    {
        Id = e.Id,
        ThemeName = e.ThemeName,
        CustomColors = JsonConvert.DeserializeObject<Dictionary<string, string>>(e.CustomColorsJson) ?? new(),
    };
}
