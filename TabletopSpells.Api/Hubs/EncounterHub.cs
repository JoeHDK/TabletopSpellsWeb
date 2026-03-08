using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TabletopSpells.Api.Data;

namespace TabletopSpells.Api.Hubs;

[Authorize]
public class EncounterHub(AppDbContext db) : Hub
{
    private string UserId => Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public async Task JoinEncounter(Guid gameRoomId)
    {
        var isMember = await db.GameMembers.AnyAsync(m => m.GameRoomId == gameRoomId && m.UserId == UserId);
        if (!isMember) return;

        await Groups.AddToGroupAsync(Context.ConnectionId, EncounterGroup(gameRoomId));
    }

    public async Task LeaveEncounter(Guid gameRoomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, EncounterGroup(gameRoomId));
    }

    private static string EncounterGroup(Guid gameRoomId) => $"encounter:{gameRoomId}";
}
