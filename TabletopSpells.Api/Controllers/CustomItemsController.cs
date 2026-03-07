using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Security.Claims;
using TabletopSpells.Api.Data;
using TabletopSpells.Api.Data.Entities;
using TabletopSpells.Api.Models;

namespace TabletopSpells.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/custom-items")]
public class CustomItemsController : ControllerBase
{
    private readonly AppDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public CustomItemsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _db.CustomItems
            .Where(i => i.UserId == UserId)
            .OrderBy(i => i.Name)
            .ToListAsync();

        return Ok(items.Select(ToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveCustomItemRequest req)
    {
        var entity = new CustomItemEntity
        {
            UserId = UserId,
            Name = req.Name,
            ItemType = req.ItemType,
            Category = req.Category,
            Rarity = req.Rarity,
            Description = req.Description,
            RequiresAttunement = req.RequiresAttunement,
            AttunementNote = req.AttunementNote,
            Cost = req.Cost,
            Weight = req.Weight,
            Damage = req.Damage,
            PropertiesJson = JsonConvert.SerializeObject(req.Properties),
        };

        _db.CustomItems.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveCustomItemRequest req)
    {
        var entity = await _db.CustomItems.FirstOrDefaultAsync(i => i.Id == id && i.UserId == UserId);
        if (entity is null) return NotFound();

        entity.Name = req.Name;
        entity.ItemType = req.ItemType;
        entity.Category = req.Category;
        entity.Rarity = req.Rarity;
        entity.Description = req.Description;
        entity.RequiresAttunement = req.RequiresAttunement;
        entity.AttunementNote = req.AttunementNote;
        entity.Cost = req.Cost;
        entity.Weight = req.Weight;
        entity.Damage = req.Damage;
        entity.PropertiesJson = JsonConvert.SerializeObject(req.Properties);

        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _db.CustomItems.FirstOrDefaultAsync(i => i.Id == id && i.UserId == UserId);
        if (entity is null) return NotFound();

        _db.CustomItems.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static CustomItemDto ToDto(CustomItemEntity e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        ItemType = e.ItemType,
        Category = e.Category,
        Rarity = e.Rarity,
        Description = e.Description,
        RequiresAttunement = e.RequiresAttunement,
        AttunementNote = e.AttunementNote,
        Cost = e.Cost,
        Weight = e.Weight,
        Damage = e.Damage,
        Properties = JsonConvert.DeserializeObject<List<string>>(e.PropertiesJson) ?? [],
        CreatedAt = e.CreatedAt,
    };
}
