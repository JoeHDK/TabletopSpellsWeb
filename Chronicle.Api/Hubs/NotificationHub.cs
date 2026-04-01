using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Chronicle.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private string UserId => Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private static string UserGroup(string userId) => $"notifications-{userId}";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(UserId));
        await base.OnConnectedAsync();
    }
}
