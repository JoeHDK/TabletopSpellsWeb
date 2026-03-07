using Microsoft.AspNetCore.Identity;
using TabletopSpells.Api.Data;
using TabletopSpells.Api.Data.Entities;

namespace TabletopSpells.Api;

public static class DataSeeder
{
    public static async Task SeedAdminAsync(IServiceProvider services)
    {
        var userManager = services.GetRequiredService<UserManager<AppUser>>();

        if (await userManager.FindByNameAsync("admin") != null) return;

        // Bypass password policy by hashing directly — for local dev only
        var hasher = services.GetRequiredService<IPasswordHasher<AppUser>>();
        var admin = new AppUser
        {
            UserName = "admin",
            NormalizedUserName = "ADMIN",
            SecurityStamp = Guid.NewGuid().ToString(),
            IsAdmin = true,
        };
        admin.PasswordHash = hasher.HashPassword(admin, "admin");

        var db = services.GetRequiredService<AppDbContext>();
        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}
