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
[Route("api/characters/{characterId:guid}/attacks")]
public class AttacksController : ControllerBase
{
    private readonly AppDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public AttacksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid characterId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var attacks = await _db.CharacterAttacks
            .Where(a => a.CharacterId == characterId)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.CreatedAt)
            .ToListAsync();

        return Ok(attacks.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Add(Guid characterId, [FromBody] AddAttackRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var attack = new CharacterAttackEntity
        {
            CharacterId = characterId,
            Name = req.Name,
            DamageFormula = req.DamageFormula,
            DamageType = req.DamageType,
            AbilityMod = req.AbilityMod,
            UseProficiency = req.UseProficiency,
            MagicBonus = req.MagicBonus,
            Notes = req.Notes,
            SortOrder = req.SortOrder,
        };

        _db.CharacterAttacks.Add(attack);
        await _db.SaveChangesAsync();
        return Ok(ToDto(attack));
    }

    [HttpPut("{attackId:guid}")]
    public async Task<IActionResult> Update(Guid characterId, Guid attackId, [FromBody] UpdateAttackRequest req)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var attack = await _db.CharacterAttacks
            .FirstOrDefaultAsync(a => a.Id == attackId && a.CharacterId == characterId);
        if (attack == null) return NotFound();

        attack.Name = req.Name;
        attack.DamageFormula = req.DamageFormula;
        attack.DamageType = req.DamageType;
        attack.AbilityMod = req.AbilityMod;
        attack.UseProficiency = req.UseProficiency;
        attack.MagicBonus = req.MagicBonus;
        attack.Notes = req.Notes;
        attack.SortOrder = req.SortOrder;

        await _db.SaveChangesAsync();
        return Ok(ToDto(attack));
    }

    [HttpDelete("{attackId:guid}")]
    public async Task<IActionResult> Remove(Guid characterId, Guid attackId)
    {
        if (!await OwnsCharacter(characterId)) return Forbid();

        var attack = await _db.CharacterAttacks
            .FirstOrDefaultAsync(a => a.Id == attackId && a.CharacterId == characterId);
        if (attack == null) return NotFound();

        _db.CharacterAttacks.Remove(attack);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> OwnsCharacter(Guid characterId) =>
        await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == UserId);

    private static CharacterAttackDto ToDto(CharacterAttackEntity e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        DamageFormula = e.DamageFormula,
        DamageType = e.DamageType,
        AbilityMod = e.AbilityMod,
        UseProficiency = e.UseProficiency,
        MagicBonus = e.MagicBonus,
        Notes = e.Notes,
        SortOrder = e.SortOrder,
    };
}
