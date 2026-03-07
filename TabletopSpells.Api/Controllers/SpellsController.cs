using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TabletopSpells.Api.DTOs;
using TabletopSpells.Api.Models.Enums;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SpellsController : ControllerBase
{
    private readonly SpellService _spellService;
    public SpellsController(SpellService spellService) => _spellService = spellService;

    [HttpGet("{game}")]
    public IActionResult GetAll(Game game, [FromQuery] string? search, [FromQuery] int? level)
    {
        if (search?.Length > 100)
            return BadRequest("Search query must be 100 characters or fewer.");

        var spells = _spellService.GetSpells(game);

        if (!string.IsNullOrWhiteSpace(search))
            spells = spells.Where(s => s.Name?.Contains(search, StringComparison.OrdinalIgnoreCase) == true).ToList();

        if (level.HasValue)
            spells = _spellService.GetSpellsByLevel(game, level.Value);

        return Ok(spells);
    }
}
