using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Services;

public class GameAuthorizationService : IGameAuthorizationService
{
    private readonly AppDbContext _db;

    public GameAuthorizationService(AppDbContext db)
    {
        _db = db;
    }

    public Task<bool> IsMemberAsync(Guid gameRoomId, string userId) =>
        _db.GameMembers.AnyAsync(m => m.GameRoomId == gameRoomId && m.UserId == userId);

    public Task<bool> IsDmAsync(Guid gameRoomId, string userId) =>
        _db.GameMembers.AnyAsync(m => m.GameRoomId == gameRoomId && m.UserId == userId && m.Role == GameRole.DM);

    public async Task<bool> IsGlobalDmAsync(string userId)
    {
        var user = await _db.Users.FindAsync(userId);
        return user?.IsDm == true || user?.IsAdmin == true;
    }
}
