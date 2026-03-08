using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[ApiController]
[Route("api/races")]
[Authorize]
public class RacesController(RaceService races) : ControllerBase
{
    // GET /api/races?search=elf
    [HttpGet]
    public IActionResult GetAll([FromQuery] string? search = null)
    {
        var result = races.Search(search);
        return Ok(result);
    }

    // GET /api/races/{index}
    [HttpGet("{index}")]
    public IActionResult GetOne(string index)
    {
        var race = races.GetByIndex(index);
        return race == null ? NotFound() : Ok(race);
    }
}
