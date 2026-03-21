using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/class-features")]
[Authorize]
public class ClassFeaturesController(ClassFeatureService features) : ControllerBase
{
    // GET /api/class-features?class=barbarian&level=5&subclass=berserker
    [HttpGet]
    public IActionResult Get([FromQuery] string @class, [FromQuery] int level = 1, [FromQuery] string? subclass = null)
    {
        if (string.IsNullOrWhiteSpace(@class))
            return BadRequest("class is required");

        var result = features.GetForCharacter(@class, level, subclass);
        return Ok(result);
    }

    // GET /api/class-features/{index}
    [HttpGet("{index}")]
    public IActionResult GetOne(string index)
    {
        var feat = features.GetByIndex(index);
        return feat == null ? NotFound() : Ok(feat);
    }
}
