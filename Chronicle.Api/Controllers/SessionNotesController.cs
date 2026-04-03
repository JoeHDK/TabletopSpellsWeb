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
[Route("api/game-rooms/{gameRoomId}/planner/notes")]
[Authorize]
public class SessionNotesController(AppDbContext db, IGameAuthorizationService authService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/game-rooms/{gameRoomId}/planner/notes
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid gameRoomId)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var notes = await db.SessionNotes
            .Where(n => n.GameRoomId == gameRoomId)
            .OrderBy(n => n.SortOrder)
            .ThenBy(n => n.CreatedAt)
            .Select(n => ToDto(n))
            .ToListAsync();

        return Ok(notes);
    }

    // POST /api/game-rooms/{gameRoomId}/planner/notes
    [HttpPost]
    public async Task<IActionResult> Create(Guid gameRoomId, [FromBody] CreateSessionNoteRequest request)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var maxSort = await db.SessionNotes
            .Where(n => n.GameRoomId == gameRoomId)
            .Select(n => (int?)n.SortOrder)
            .MaxAsync() ?? -1;

        var note = new SessionNoteEntity
        {
            GameRoomId = gameRoomId,
            Title = request.Title,
            Content = request.Content,
            SortOrder = maxSort + 1,
        };
        db.SessionNotes.Add(note);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { gameRoomId }, ToDto(note));
    }

    // PUT /api/game-rooms/{gameRoomId}/planner/notes/{noteId}
    [HttpPut("{noteId:guid}")]
    public async Task<IActionResult> Update(Guid gameRoomId, Guid noteId, [FromBody] UpdateSessionNoteRequest request)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var note = await db.SessionNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.GameRoomId == gameRoomId);
        if (note == null) return NotFound();

        if (request.Title != null) note.Title = request.Title;
        if (request.Content != null) note.Content = request.Content;
        if (request.SortOrder.HasValue) note.SortOrder = request.SortOrder.Value;
        note.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(note));
    }

    // DELETE /api/game-rooms/{gameRoomId}/planner/notes/{noteId}
    [HttpDelete("{noteId:guid}")]
    public async Task<IActionResult> Delete(Guid gameRoomId, Guid noteId)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var note = await db.SessionNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.GameRoomId == gameRoomId);
        if (note == null) return NotFound();

        db.SessionNotes.Remove(note);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static SessionNoteDto ToDto(SessionNoteEntity n) => new()
    {
        Id = n.Id,
        GameRoomId = n.GameRoomId,
        Title = n.Title,
        Content = n.Content,
        SortOrder = n.SortOrder,
        CreatedAt = n.CreatedAt,
        UpdatedAt = n.UpdatedAt,
    };
}

