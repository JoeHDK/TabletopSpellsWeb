using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Security.Claims;
using System.Text.Json;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.Models;

namespace Chronicle.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/custom-items")]
public class CustomItemsController : ControllerBase
{
    private readonly AppDbContext _db;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsDm => User.FindFirstValue("isDm") == "true";

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
        if (!IsDm) return Forbid();

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
            DamageEntriesJson = req.DamageEntries is not null
                ? System.Text.Json.JsonSerializer.Serialize(req.DamageEntries)
                : null,
            AbilitiesJson = req.Abilities.Count > 0
                ? System.Text.Json.JsonSerializer.Serialize(req.Abilities)
                : null,
            AcBonus = req.AcBonus,
            StrBonus = req.StrBonus,
            ConBonus = req.ConBonus,
            DexBonus = req.DexBonus,
            WisBonus = req.WisBonus,
            IntBonus = req.IntBonus,
            ChaBonus = req.ChaBonus,
            SavingThrowBonus = req.SavingThrowBonus,
        };

        _db.CustomItems.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveCustomItemRequest req)
    {
        if (!IsDm) return Forbid();
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
        entity.DamageEntriesJson = req.DamageEntries is not null
            ? System.Text.Json.JsonSerializer.Serialize(req.DamageEntries)
            : null;
        entity.AbilitiesJson = req.Abilities.Count > 0
            ? System.Text.Json.JsonSerializer.Serialize(req.Abilities)
            : null;
        entity.AcBonus = req.AcBonus;
        entity.StrBonus = req.StrBonus;
        entity.ConBonus = req.ConBonus;
        entity.DexBonus = req.DexBonus;
        entity.WisBonus = req.WisBonus;
        entity.IntBonus = req.IntBonus;
        entity.ChaBonus = req.ChaBonus;
        entity.SavingThrowBonus = req.SavingThrowBonus;

        await _db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!IsDm) return Forbid();
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
        DamageEntries = e.DamageEntriesJson is not null
            ? System.Text.Json.JsonSerializer.Deserialize<List<DamageEntryDto>>(e.DamageEntriesJson)
            : null,
        Abilities = e.AbilitiesJson is not null
            ? System.Text.Json.JsonSerializer.Deserialize<List<CustomItemAbilityDto>>(e.AbilitiesJson) ?? []
            : [],
        AcBonus = e.AcBonus,
        StrBonus = e.StrBonus,
        ConBonus = e.ConBonus,
        DexBonus = e.DexBonus,
        WisBonus = e.WisBonus,
        IntBonus = e.IntBonus,
        ChaBonus = e.ChaBonus,
        SavingThrowBonus = e.SavingThrowBonus,
        CreatedAt = e.CreatedAt,
    };
}
