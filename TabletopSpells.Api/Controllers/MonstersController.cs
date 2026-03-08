using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[ApiController]
[Route("api/monsters")]
[Authorize]
public class MonstersController(MonsterService monsterService) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] double? minCr,
        [FromQuery] double? maxCr)
    {
        if (search?.Length > 100)
            return BadRequest("Search term too long.");

        var results = monsterService.GetMonsters(search, type, minCr, maxCr);
        return Ok(results);
    }

    [HttpGet("types")]
    public IActionResult GetTypes()
    {
        return Ok(monsterService.GetTypes());
    }

    [HttpGet("{name}")]
    public IActionResult GetByName(string name)
    {
        var monster = monsterService.GetMonster(name);
        if (monster == null) return NotFound();
        return Ok(monster);
    }
}
