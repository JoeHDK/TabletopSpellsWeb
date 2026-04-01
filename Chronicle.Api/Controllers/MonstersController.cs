using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Chronicle.Api.Data;
using Chronicle.Api.DTOs;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/monsters")]
[Authorize]
public class MonstersController(MonsterService monsterService, AppDbContext db) : ControllerBase
{
    private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] double? minCr,
        [FromQuery] double? maxCr)
    {
        if (search?.Length > 100)
            return BadRequest("Search term too long.");

        var customMonsters = UserId is not null
            ? await db.CustomMonsters.Where(m => m.UserId == UserId).ToListAsync()
            : [];

        // When filtering by "custom", return only custom monsters
        if (string.Equals(type, "custom", StringComparison.OrdinalIgnoreCase))
        {
            var filtered = customMonsters
                .Where(m => string.IsNullOrWhiteSpace(search) || m.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
                .Where(m => minCr == null || m.ChallengeRating >= minCr)
                .Where(m => maxCr == null || m.ChallengeRating <= maxCr)
                .OrderBy(m => m.ChallengeRating)
                .ThenBy(m => m.Name)
                .Select(ToSummary);
            return Ok(filtered);
        }

        var srdResults = monsterService.GetMonsters(search, type, minCr, maxCr);

        // When no type filter, append custom monsters to SRD results
        if (string.IsNullOrWhiteSpace(type))
        {
            var customSummaries = customMonsters
                .Where(m => string.IsNullOrWhiteSpace(search) || m.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
                .Where(m => minCr == null || m.ChallengeRating >= minCr)
                .Where(m => maxCr == null || m.ChallengeRating <= maxCr)
                .Select(ToSummary);
            return Ok(srdResults.Concat(customSummaries));
        }

        return Ok(srdResults);
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetTypes()
    {
        var types = monsterService.GetTypes();

        if (UserId is not null && await db.CustomMonsters.AnyAsync(m => m.UserId == UserId))
            types = [.. types, "custom"];

        return Ok(types);
    }

    [HttpGet("{name}")]
    public IActionResult GetByName(string name)
    {
        var monster = monsterService.GetMonster(name);
        if (monster == null) return NotFound();
        return Ok(monster);
    }

    private static MonsterSummaryDto ToSummary(Data.Entities.CustomMonsterEntity m) => new()
    {
        Name = m.Name,
        Type = m.Type,
        Cr = m.ChallengeRating,
        Size = m.Size,
        Ac = m.ArmorClass,
        Hp = m.HitPoints,
        Source = "custom",
    };
}
