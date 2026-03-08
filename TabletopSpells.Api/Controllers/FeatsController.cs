using Microsoft.AspNetCore.Mvc;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[ApiController]
[Route("api/feats")]
public class FeatsController : ControllerBase
{
    private readonly FeatService _feats;
    public FeatsController(FeatService feats) => _feats = feats;

    [HttpGet]
    public IActionResult GetAll([FromQuery] string? search) =>
        Ok(_feats.Search(search));

    [HttpGet("{index}")]
    public IActionResult Get(string index)
    {
        var feat = _feats.GetFeat(index);
        return feat is null ? NotFound() : Ok(feat);
    }
}
