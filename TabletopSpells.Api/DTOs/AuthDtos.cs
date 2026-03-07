namespace TabletopSpells.Api.DTOs;

using System.ComponentModel.DataAnnotations;

public record RegisterRequest(
    [StringLength(50, MinimumLength = 3)] string Username,
    [StringLength(100, MinimumLength = 8)] string Password
);
public record LoginRequest(
    [StringLength(50)] string Username,
    [StringLength(100)] string Password
);
public record AuthResponse(string Token, string Username, string UserId, bool IsDm);
