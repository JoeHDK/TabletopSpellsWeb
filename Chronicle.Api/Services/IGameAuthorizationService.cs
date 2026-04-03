namespace Chronicle.Api.Services;

public interface IGameAuthorizationService
{
    Task<bool> IsMemberAsync(Guid gameRoomId, string userId);
    Task<bool> IsDmAsync(Guid gameRoomId, string userId);
    Task<bool> IsGlobalDmAsync(string userId);
}
