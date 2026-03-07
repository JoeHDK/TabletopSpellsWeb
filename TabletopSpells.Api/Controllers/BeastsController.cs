using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BeastsController(BeastService beastService) : ControllerBase
{
    [HttpGet]
    public IActionResult GetBeasts(
        [FromQuery] double? maxCr = null,
        [FromQuery] bool allowFly = true,
        [FromQuery] bool allowSwim = true)
    {
        var beasts = beastService.GetBeasts(maxCr, allowFly, allowSwim);
        return Ok(beasts);
    }
}
