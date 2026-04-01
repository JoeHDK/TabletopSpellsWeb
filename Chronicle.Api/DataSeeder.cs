using Microsoft.AspNetCore.Identity;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;

namespace Chronicle.Api;

public static class DataSeeder
{
    public static async Task SeedAdminAsync(IServiceProvider services)
    {
        var env = services.GetRequiredService<IWebHostEnvironment>();
        var userManager = services.GetRequiredService<UserManager<AppUser>>();

        if (await userManager.FindByNameAsync("admin") != null) return;

        // Generate a random password and log it once — never hardcode credentials
        var password = $"Admin-{Guid.NewGuid():N}".Substring(0, 24);

        var admin = new AppUser
        {
            UserName = "admin",
            NormalizedUserName = "ADMIN",
            SecurityStamp = Guid.NewGuid().ToString(),
            IsAdmin = true,
        };

        var hasher = services.GetRequiredService<IPasswordHasher<AppUser>>();
        admin.PasswordHash = hasher.HashPassword(admin, password);

        var db = services.GetRequiredService<AppDbContext>();
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        // Print once to stdout so the operator can retrieve it from logs
        Console.WriteLine("=================================================");
        Console.WriteLine($"  Admin account created");
        Console.WriteLine($"  Username : admin");
        Console.WriteLine($"  Password : {password}");
        Console.WriteLine("  Change this password after first login.");
        Console.WriteLine("=================================================");
    }
}
