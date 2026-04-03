using Chronicle.Api.Data.Entities;

namespace Chronicle.Api.Services;

public interface INotificationService
{
    Task PushAsync(NotificationEntity entity);
}
