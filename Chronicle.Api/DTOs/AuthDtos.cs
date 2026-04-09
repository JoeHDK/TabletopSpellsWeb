namespace Chronicle.Api.DTOs;

using System.ComponentModel.DataAnnotations;

public record RegisterRequest(
    [StringLength(50, MinimumLength = 3)] string Username,
    [StringLength(100, MinimumLength = 8)] string Password,
    [EmailAddress][StringLength(256)] string Email
);
public record LoginRequest(
    [StringLength(256)] string Identifier,
    [StringLength(100)] string Password
);
public record AuthResponse(string Token, string Username, string UserId, bool IsDm, string? Email = null);
public record ChangePasswordRequest(
    [StringLength(100)] string CurrentPassword,
    [StringLength(100, MinimumLength = 8)] string NewPassword
);
public record ChangeEmailRequest(
    [EmailAddress][StringLength(256)] string NewEmail,
    [StringLength(100)] string CurrentPassword
);
public record ChangeUsernameRequest(
    [StringLength(50, MinimumLength = 3)] string NewUsername
);
public record MeResponse(bool HasEmail, string Username, string? Email);
