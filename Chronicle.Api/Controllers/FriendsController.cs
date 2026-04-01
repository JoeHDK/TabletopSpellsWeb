using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Hubs;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly IHubContext<NotificationHub> _notifHub;
    private readonly WebPushService _pushService;

    public FriendsController(AppDbContext db, UserManager<AppUser> userManager, IHubContext<NotificationHub> notifHub, WebPushService pushService)
    {
        _db = db;
        _userManager = userManager;
        _notifHub = notifHub;
        _pushService = pushService;
    }

    private string CurrentUserId => _userManager.GetUserId(User)!;

    private async Task PushNotifAsync(NotificationEntity entity)
    {
        var dto = new NotificationDto
        {
            Id = entity.Id,
            Type = entity.Type.ToString(),
            Title = entity.Title,
            Message = entity.Message,
            Link = entity.Link,
            IsRead = false,
            CreatedAt = entity.CreatedAt,
        };
        await _notifHub.Clients.Group($"notifications-{entity.UserId}").SendAsync("ReceiveNotification", dto);
        await _pushService.SendNotificationAsync(entity.UserId, dto);
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    public record FriendDto(string UserId, string Username);
    public record FriendRequestDto(Guid Id, string RequesterId, string RequesterUsername, DateTime CreatedAt);
    public record SendFriendRequestBody(string Username);
    public record UserSearchResultDto(string UserId, string Username, string? FriendshipStatus);

    // ── Endpoints ────────────────────────────────────────────────────────────

    /// <summary>Get all accepted friends for the current user.</summary>
    [HttpGet]
    public async Task<IActionResult> GetFriends()
    {
        var myId = CurrentUserId;
        var friendships = await _db.Friendships
            .Where(f => f.Status == FriendshipStatus.Accepted &&
                        (f.RequesterId == myId || f.AddresseeId == myId))
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .ToListAsync();

        var friends = friendships.Select(f =>
        {
            var other = f.RequesterId == myId ? f.Addressee! : f.Requester!;
            return new FriendDto(other.Id, other.UserName ?? "");
        });

        return Ok(friends);
    }

    /// <summary>Get incoming pending friend requests (sent TO the current user).</summary>
    [HttpGet("requests")]
    public async Task<IActionResult> GetIncomingRequests()
    {
        var myId = CurrentUserId;
        var requests = await _db.Friendships
            .Where(f => f.AddresseeId == myId && f.Status == FriendshipStatus.Pending)
            .Include(f => f.Requester)
            .Select(f => new FriendRequestDto(f.Id, f.RequesterId, f.Requester!.UserName ?? "", f.CreatedAt))
            .ToListAsync();

        return Ok(requests);
    }

    /// <summary>Send a friend request to another user by username.</summary>
    [HttpPost("request")]
    public async Task<IActionResult> SendRequest([FromBody] SendFriendRequestBody body)
    {
        var myId = CurrentUserId;
        var target = await _userManager.FindByNameAsync(body.Username);
        if (target == null) return NotFound("User not found.");
        if (target.Id == myId) return BadRequest("You cannot friend yourself.");

        // Check for any existing relationship (either direction)
        var existing = await _db.Friendships.FirstOrDefaultAsync(f =>
            (f.RequesterId == myId && f.AddresseeId == target.Id) ||
            (f.RequesterId == target.Id && f.AddresseeId == myId));

        if (existing != null)
        {
            return existing.Status switch
            {
                FriendshipStatus.Accepted => Conflict("You are already friends."),
                FriendshipStatus.Pending => Conflict("A friend request already exists."),
                FriendshipStatus.Blocked => Conflict("Unable to send request."),
                _ => Conflict("Request already exists."),
            };
        }

        var friendship = new FriendshipEntity
        {
            RequesterId = myId,
            AddresseeId = target.Id,
            Status = FriendshipStatus.Pending,
        };
        _db.Friendships.Add(friendship);

        var me = await _userManager.GetUserAsync(User);
        var friendRequestNotif = new NotificationEntity
        {
            UserId = target.Id,
            Type = NotificationType.FriendRequest,
            Title = "Friend request",
            Message = $"{me?.UserName ?? "Someone"} sent you a friend request.",
            Link = "/friends?tab=requests",
        };
        _db.Notifications.Add(friendRequestNotif);

        await _db.SaveChangesAsync();
        await PushNotifAsync(friendRequestNotif);
        return Ok(new { friendship.Id });
    }

    /// <summary>Accept an incoming friend request.</summary>
    [HttpPost("requests/{id:guid}/accept")]
    public async Task<IActionResult> AcceptRequest(Guid id)
    {
        var myId = CurrentUserId;
        var friendship = await _db.Friendships.FindAsync(id);
        if (friendship == null || friendship.AddresseeId != myId) return NotFound();
        if (friendship.Status != FriendshipStatus.Pending) return BadRequest("Request is not pending.");

        friendship.Status = FriendshipStatus.Accepted;
        friendship.UpdatedAt = DateTime.UtcNow;

        var me = await _userManager.GetUserAsync(User);
        var acceptedNotif = new NotificationEntity
        {
            UserId = friendship.RequesterId,
            Type = NotificationType.FriendAccepted,
            Title = "Friend request accepted",
            Message = $"{me?.UserName ?? "Someone"} accepted your friend request.",
            Link = "/friends",
        };
        _db.Notifications.Add(acceptedNotif);

        await _db.SaveChangesAsync();
        await PushNotifAsync(acceptedNotif);
        return Ok();
    }

    /// <summary>Decline (or cancel) a friend request.</summary>
    [HttpPost("requests/{id:guid}/decline")]
    public async Task<IActionResult> DeclineRequest(Guid id)
    {
        var myId = CurrentUserId;
        var friendship = await _db.Friendships.FindAsync(id);
        if (friendship == null) return NotFound();

        // Both the addressee (declining) and the requester (cancelling their own request) may call this
        if (friendship.AddresseeId != myId && friendship.RequesterId != myId) return Forbid();
        if (friendship.Status != FriendshipStatus.Pending) return BadRequest("Request is not pending.");

        _db.Friendships.Remove(friendship);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Remove an accepted friend (unfriend).</summary>
    [HttpDelete("{friendUserId}")]
    public async Task<IActionResult> RemoveFriend(string friendUserId)
    {
        var myId = CurrentUserId;
        var friendship = await _db.Friendships.FirstOrDefaultAsync(f =>
            f.Status == FriendshipStatus.Accepted &&
            ((f.RequesterId == myId && f.AddresseeId == friendUserId) ||
             (f.RequesterId == friendUserId && f.AddresseeId == myId)));

        if (friendship == null) return NotFound();
        _db.Friendships.Remove(friendship);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

/// <summary>User search/discovery endpoint.</summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _db;

    public UsersController(UserManager<AppUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    private string CurrentUserId => _userManager.GetUserId(User)!;

    public record UserSearchResultDto(string UserId, string Username, string? FriendshipStatus);

    /// <summary>Search users by username prefix, returning up to 20 results with friendship status.</summary>
    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return BadRequest("Query must be at least 2 characters.");

        var myId = CurrentUserId;

        var users = await _userManager.Users
            .Where(u => u.Id != myId && u.UserName != null &&
                        u.NormalizedUserName!.Contains(q.ToUpperInvariant()))
            .Take(20)
            .Select(u => new { u.Id, u.UserName })
            .ToListAsync();

        if (users.Count == 0) return Ok(Array.Empty<UserSearchResultDto>());

        var userIds = users.Select(u => u.Id).ToList();
        var friendships = await _db.Friendships
            .Where(f => (f.RequesterId == myId && userIds.Contains(f.AddresseeId)) ||
                        (f.AddresseeId == myId && userIds.Contains(f.RequesterId)))
            .ToListAsync();

        var results = users.Select(u =>
        {
            var f = friendships.FirstOrDefault(x =>
                x.RequesterId == u.Id || x.AddresseeId == u.Id);
            var status = f == null ? null : f.Status.ToString();
            return new UserSearchResultDto(u.Id, u.UserName ?? "", status);
        });

        return Ok(results);
    }
}
