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

        // Write password to startup log only — avoid printing secrets to stdout/docker logs
        var logPath = Path.Combine(AppContext.BaseDirectory, "admin-init.log");
        var logLine = $"[{DateTime.UtcNow:O}] Admin account created. Username: admin  Password: {password}  (Change after first login.)";
        await File.WriteAllTextAsync(logPath, logLine + Environment.NewLine);
        Console.WriteLine("=================================================");
        Console.WriteLine("  Admin account created.");
        Console.WriteLine($"  Check startup log for credentials: {logPath}");
        Console.WriteLine("=================================================");
    }
}
