using WebPush;
using Chronicle.Api.Data;
using Chronicle.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Chronicle.Api.Services;

public class VapidConfiguration
{
    public string Subject { get; set; } = "";
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";
}

public class WebPushService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly VapidConfiguration _vapid;
    private readonly ILogger<WebPushService> _logger;

    public WebPushService(IServiceScopeFactory scopeFactory, VapidConfiguration vapid, ILogger<WebPushService> logger)
    {
        _scopeFactory = scopeFactory;
        _vapid = vapid;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_vapid.PublicKey) &&
        !string.IsNullOrEmpty(_vapid.PrivateKey);

    public async Task SendNotificationAsync(string userId, NotificationDto dto)
    {
        if (!IsConfigured) return;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var subscriptions = await db.PushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        if (subscriptions.Count == 0) return;

        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            title = dto.Title,
            body = dto.Message,
            url = dto.Link ?? "/",
        });

        var client = new WebPushClient();
        client.SetVapidDetails(_vapid.Subject, _vapid.PublicKey, _vapid.PrivateKey);

        var staleIds = new List<Guid>();

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await client.SendNotificationAsync(pushSub, payload);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone || ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                // Subscription is expired / unsubscribed — remove it
                staleIds.Add(sub.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send push notification to endpoint {Endpoint}", sub.Endpoint);
            }
        }

        if (staleIds.Count > 0)
        {
            await db.PushSubscriptions
                .Where(s => staleIds.Contains(s.Id))
                .ExecuteDeleteAsync();
        }
    }
}
