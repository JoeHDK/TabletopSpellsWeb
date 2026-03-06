using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ItemsController : ControllerBase
{
    private readonly ItemService _itemService;
    public ItemsController(ItemService itemService) => _itemService = itemService;

    [HttpGet]
    public IActionResult GetAll(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? rarity,
        [FromQuery] string? itemType)
    {
        var items = _itemService.Search(search, category, rarity, itemType);
        return Ok(items);
    }

    [HttpGet("categories")]
    public IActionResult GetCategories() => Ok(_itemService.GetCategories());
}
