using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/push")]
[Authorize]
public class PushSubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly WebPushService _pushService;
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    public PushSubscriptionsController(AppDbContext db, WebPushService pushService)
    {
        _db = db;
        _pushService = pushService;
    }

    /// <summary>Returns the VAPID public key so the client can subscribe.</summary>
    [HttpGet("vapid-key")]
    [AllowAnonymous]
    public IActionResult GetVapidKey()
    {
        if (!_pushService.IsConfigured)
            return NotFound("Push notifications not configured.");

        // VapidConfiguration is registered in DI — reach it via service
        var vapid = HttpContext.RequestServices.GetRequiredService<VapidConfiguration>();
        return Ok(new { publicKey = vapid.PublicKey });
    }

    /// <summary>Saves (or updates) a push subscription for the current user.</summary>
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeRequest req)
    {
        if (string.IsNullOrEmpty(req.Endpoint) || string.IsNullOrEmpty(req.P256dh) || string.IsNullOrEmpty(req.Auth))
            return BadRequest("endpoint, p256dh, and auth are required.");

        var existing = await _db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.Endpoint == req.Endpoint);

        if (existing != null)
        {
            existing.P256dh = req.P256dh;
            existing.Auth = req.Auth;
        }
        else
        {
            _db.PushSubscriptions.Add(new PushSubscriptionEntity
            {
                UserId = UserId,
                Endpoint = req.Endpoint,
                P256dh = req.P256dh,
                Auth = req.Auth,
            });
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Removes a push subscription (e.g. user explicitly disables notifications).</summary>
    [HttpDelete("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest req)
    {
        await _db.PushSubscriptions
            .Where(s => s.UserId == UserId && s.Endpoint == req.Endpoint)
            .ExecuteDeleteAsync();

        return NoContent();
    }
}

public record PushSubscribeRequest(string Endpoint, string P256dh, string Auth);
public record UnsubscribeRequest(string Endpoint);
