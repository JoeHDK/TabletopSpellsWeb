using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using TabletopSpells.Api.Data.Entities;
using TabletopSpells.Api.DTOs;
using TabletopSpells.Api.Services;

namespace TabletopSpells.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly TokenService _tokenService;

    public AuthController(UserManager<AppUser> userManager, TokenService tokenService)
    {
        _userManager = userManager;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        if (await _userManager.FindByNameAsync(req.Username) != null)
            return Conflict("Username already taken.");

        var user = new AppUser { UserName = req.Username };
        var result = await _userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new AuthResponse(_tokenService.CreateToken(user), user.UserName!, user.Id));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await _userManager.FindByNameAsync(req.Username);
        if (user == null || !await _userManager.CheckPasswordAsync(user, req.Password))
            return Unauthorized("Invalid username or password.");

        return Ok(new AuthResponse(_tokenService.CreateToken(user), user.UserName!, user.Id));
    }
}
