using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/game-rooms/{gameRoomId}/log")]
[Authorize]
public class CampaignLogController(AppDbContext db, IGameAuthorizationService authService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private string Username => User.Identity?.Name ?? "Unknown";

    // GET /api/game-rooms/{gameRoomId}/log
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid gameRoomId)
    {
        if (!await authService.IsMemberAsync(gameRoomId, UserId)) return Forbid();

        var isDm = await authService.IsDmAsync(gameRoomId, UserId);

        IQueryable<CampaignLogEntryEntity> query = db.CampaignLogEntries
            .Where(e => e.GameRoomId == gameRoomId);

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
        if (!await authService.IsMemberAsync(gameRoomId, UserId)) return Forbid();

        var entry = new CampaignLogEntryEntity
        {
            GameRoomId = gameRoomId,
            AuthorUserId = UserId,
            AuthorUsername = Username,
            Title = request.Title,
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
        var isDm = await authService.IsDmAsync(gameRoomId, UserId);
        if (entry.AuthorUserId != UserId && !isDm) return Forbid();

        entry.Title = request.Title;
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

        var isDm = await authService.IsDmAsync(gameRoomId, UserId);
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
        Title = e.Title,
        Content = e.Content,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
    };
}
