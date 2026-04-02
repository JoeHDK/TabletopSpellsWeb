using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/game-rooms/{gameRoomId}/log")]
[Authorize]
public class CampaignLogController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string Username => User.Identity?.Name ?? "Unknown";

    private async Task<bool> IsMember(Guid gameRoomId) =>
        await db.GameMembers.AnyAsync(m => m.GameRoomId == gameRoomId && m.UserId == UserId);

    private async Task<bool> IsDm(Guid gameRoomId) =>
        await db.GameMembers.AnyAsync(m => m.GameRoomId == gameRoomId && m.UserId == UserId && m.Role == GameRole.DM);

    // GET /api/game-rooms/{gameRoomId}/log
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid gameRoomId)
    {
        if (!await IsMember(gameRoomId)) return Forbid();

        var isDm = await IsDm(gameRoomId);

        IQueryable<CampaignLogEntryEntity> query = db.CampaignLogEntries
            .Where(e => e.GameRoomId == gameRoomId);

        // DM sees all entries; players see only their own entries
        if (!isDm)
            query = query.Where(e => e.AuthorUserId == UserId);

        var entries = await query
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => ToDto(e))
            .ToListAsync();

        return Ok(entries);
    }

    // POST /api/game-rooms/{gameRoomId}/log
    [HttpPost]
    public async Task<IActionResult> Create(Guid gameRoomId, [FromBody] CreateCampaignLogEntryRequest request)
    {
        if (!await IsMember(gameRoomId)) return Forbid();

        var entry = new CampaignLogEntryEntity
        {
            GameRoomId = gameRoomId,
            AuthorUserId = UserId,
            AuthorUsername = Username,
            Content = request.Content,
        };
        db.CampaignLogEntries.Add(entry);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { gameRoomId }, ToDto(entry));
    }

    // PUT /api/game-rooms/{gameRoomId}/log/{entryId}
    [HttpPut("{entryId:guid}")]
    public async Task<IActionResult> Update(Guid gameRoomId, Guid entryId, [FromBody] UpdateCampaignLogEntryRequest request)
    {
        var entry = await db.CampaignLogEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.GameRoomId == gameRoomId);
        if (entry == null) return NotFound();

        // Only author (or DM) can edit
        var isDm = await IsDm(gameRoomId);
        if (entry.AuthorUserId != UserId && !isDm) return Forbid();

        entry.Content = request.Content;
        entry.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(entry));
    }

    // DELETE /api/game-rooms/{gameRoomId}/log/{entryId}
    [HttpDelete("{entryId:guid}")]
    public async Task<IActionResult> Delete(Guid gameRoomId, Guid entryId)
    {
        var entry = await db.CampaignLogEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.GameRoomId == gameRoomId);
        if (entry == null) return NotFound();

        var isDm = await IsDm(gameRoomId);
        if (entry.AuthorUserId != UserId && !isDm) return Forbid();

        db.CampaignLogEntries.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CampaignLogEntryDto ToDto(CampaignLogEntryEntity e) => new()
    {
        Id = e.Id,
        GameRoomId = e.GameRoomId,
        AuthorUserId = e.AuthorUserId,
        AuthorUsername = e.AuthorUsername,
        Content = e.Content,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };
}
