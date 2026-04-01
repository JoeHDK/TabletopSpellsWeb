using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/custom-monsters")]
public class CustomMonstersController : ControllerBase
{
    private readonly AppDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public CustomMonstersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var monsters = await _db.CustomMonsters
            .Where(m => m.UserId == UserId)
            .OrderBy(m => m.Name)
            .ToListAsync();

        return Ok(monsters.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveCustomMonsterRequest req)
    {
        var entity = new CustomMonsterEntity
        {
            UserId = UserId,
            Name = req.Name,
            Type = req.Type,
            ChallengeRating = req.ChallengeRating,
            HitPoints = req.HitPoints,
            ArmorClass = req.ArmorClass,
            Speed = req.Speed,
            Size = req.Size,
            Strength = req.Strength,
            Dexterity = req.Dexterity,
            Constitution = req.Constitution,
            Intelligence = req.Intelligence,
            Wisdom = req.Wisdom,
            Charisma = req.Charisma,
            Description = req.Description,
        };

        _db.CustomMonsters.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveCustomMonsterRequest req)
    {
        var entity = await _db.CustomMonsters.FirstOrDefaultAsync(m => m.Id == id && m.UserId == UserId);
        if (entity is null) return NotFound();

        entity.Name = req.Name;
        entity.Type = req.Type;
        entity.ChallengeRating = req.ChallengeRating;
        entity.HitPoints = req.HitPoints;
        entity.ArmorClass = req.ArmorClass;
        entity.Speed = req.Speed;
        entity.Size = req.Size;
        entity.Strength = req.Strength;
        entity.Dexterity = req.Dexterity;
        entity.Constitution = req.Constitution;
        entity.Intelligence = req.Intelligence;
        entity.Wisdom = req.Wisdom;
        entity.Charisma = req.Charisma;
        entity.Description = req.Description;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _db.CustomMonsters.FirstOrDefaultAsync(m => m.Id == id && m.UserId == UserId);
        if (entity is null) return NotFound();

        _db.CustomMonsters.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static CustomMonsterDto ToDto(CustomMonsterEntity e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        Type = e.Type,
        ChallengeRating = e.ChallengeRating,
        HitPoints = e.HitPoints,
        ArmorClass = e.ArmorClass,
        Speed = e.Speed,
        Size = e.Size,
        Strength = e.Strength,
        Dexterity = e.Dexterity,
        Constitution = e.Constitution,
        Intelligence = e.Intelligence,
        Wisdom = e.Wisdom,
        Charisma = e.Charisma,
        Description = e.Description,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };
}
