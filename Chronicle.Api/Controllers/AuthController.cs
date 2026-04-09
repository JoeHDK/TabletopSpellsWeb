using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly TokenService _tokenService;

    private const string RefreshCookie = "refresh_token";
    private static readonly CookieOptions RefreshCookieOptions = new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        MaxAge = TimeSpan.FromDays(30),
    };

    public AuthController(UserManager<AppUser> userManager, TokenService tokenService)
    {
        _userManager = userManager;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        if (await _userManager.FindByNameAsync(req.Username) != null)
            return Conflict("Username already taken.");

        if (await _userManager.FindByEmailAsync(req.Email) != null)
            return Conflict("Email already in use.");

        var user = new AppUser { UserName = req.Username, Email = req.Email };
        var result = await _userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await IssueRefreshToken(user);
        return Ok(new AuthResponse(_tokenService.CreateToken(user), user.UserName!, user.Id, user.IsDm || user.IsAdmin, user.Email));
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        // Accept email or username
        var user = await _userManager.FindByEmailAsync(req.Identifier)
                ?? await _userManager.FindByNameAsync(req.Identifier);

        if (user == null || !await _userManager.CheckPasswordAsync(user, req.Password))
            return Unauthorized("Invalid credentials.");

        await IssueRefreshToken(user);
        return Ok(new AuthResponse(_tokenService.CreateToken(user), user.UserName!, user.Id, user.IsDm || user.IsAdmin, user.Email));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        var raw = Request.Cookies[RefreshCookie];
        if (string.IsNullOrEmpty(raw)) return Unauthorized();

        var hash = TokenService.HashRefreshToken(raw);
        var user = _userManager.Users.SingleOrDefault(u =>
            u.RefreshTokenHash == hash && u.RefreshTokenExpiresAt > DateTime.UtcNow);

        if (user == null) return Unauthorized();

        await IssueRefreshToken(user);
        return Ok(new AuthResponse(_tokenService.CreateToken(user), user.UserName!, user.Id, user.IsDm || user.IsAdmin, user.Email));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var raw = Request.Cookies[RefreshCookie];
        if (!string.IsNullOrEmpty(raw))
        {
            var hash = TokenService.HashRefreshToken(raw);
            var user = _userManager.Users.SingleOrDefault(u => u.RefreshTokenHash == hash);
            if (user != null)
            {
                user.RefreshTokenHash = null;
                user.RefreshTokenExpiresAt = null;
                await _userManager.UpdateAsync(user);
            }
        }
        Response.Cookies.Delete(RefreshCookie, new CookieOptions { Path = "/api/auth" });
        return Ok();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return Unauthorized();
        return Ok(new MeResponse(!string.IsNullOrEmpty(user.Email), user.UserName!, user.Email));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return Unauthorized();

        var result = await _userManager.ChangePasswordAsync(user, req.CurrentPassword, req.NewPassword);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok();
    }

    [Authorize]
    [HttpPatch("email")]
    public async Task<IActionResult> ChangeEmail(ChangeEmailRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return Unauthorized();

        if (!await _userManager.CheckPasswordAsync(user, req.CurrentPassword))
            return BadRequest("Current password is incorrect.");

        if (await _userManager.FindByEmailAsync(req.NewEmail) != null)
            return Conflict("Email already in use.");

        user.Email = req.NewEmail;
        user.NormalizedEmail = req.NewEmail.ToUpperInvariant();
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new { email = user.Email });
    }

    [Authorize]
    [HttpPatch("username")]
    public async Task<IActionResult> ChangeUsername(ChangeUsernameRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return Unauthorized();

        if (await _userManager.FindByNameAsync(req.NewUsername) != null)
            return Conflict("Username already taken.");

        var result = await _userManager.SetUserNameAsync(user, req.NewUsername);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new { username = user.UserName });
    }

    private async Task IssueRefreshToken(AppUser user)
    {
        var raw = TokenService.GenerateRefreshToken();
        user.RefreshTokenHash = TokenService.HashRefreshToken(raw);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(30);
        await _userManager.UpdateAsync(user);
        Response.Cookies.Append(RefreshCookie, raw, RefreshCookieOptions);
    }
}
