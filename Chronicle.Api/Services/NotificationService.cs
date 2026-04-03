using Microsoft.AspNetCore.SignalR;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Hubs;

namespace Chronicle.Api.Services;

public class NotificationService : INotificationService
{
    private readonly IHubContext<NotificationHub> _notifHub;
    private readonly WebPushService _pushService;

    public NotificationService(IHubContext<NotificationHub> notifHub, WebPushService pushService)
    {
        _notifHub = notifHub;
        _pushService = pushService;
    }

    public async Task PushAsync(NotificationEntity entity)
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
}
