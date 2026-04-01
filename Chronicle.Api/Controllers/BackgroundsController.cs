using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/backgrounds")]
[Authorize]
public class BackgroundsController(Services.BackgroundService backgrounds) : ControllerBase
{
    // GET /api/backgrounds
    [HttpGet]
    public IActionResult GetAll()
    {
        return Ok(backgrounds.GetAll());
    }

    // GET /api/backgrounds/{index}
    [HttpGet("{index}")]
    public IActionResult GetOne(string index)
    {
        var bg = backgrounds.GetByIndex(index);
        return bg == null ? NotFound() : Ok(bg);
    }
}
