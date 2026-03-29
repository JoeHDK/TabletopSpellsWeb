using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Chronicle.Api;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.Hubs;
using Chronicle.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity
builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
    };
    // Allow SignalR to receive JWT via query string (required for WebSocket upgrades)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) &&
                ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        },
    };
});

// CORS — SignalR WebSocket connections require AllowCredentials, which mandates explicit origins.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Services
builder.Services.AddScoped<TokenService>();
builder.Services.AddSingleton<SpellService>();
builder.Services.AddSingleton<BeastService>();
builder.Services.AddSingleton<ItemService>();
builder.Services.AddSingleton<MonsterService>();
builder.Services.AddSingleton<FeatService>();
builder.Services.AddSingleton<ClassFeatureService>();
builder.Services.AddSingleton<RaceService>();
builder.Services.AddSingleton<EncryptionService>();
builder.Services.AddSingleton<ClassResourceSeedService>();

// VAPID / Web Push
var vapid = new Chronicle.Api.Services.VapidConfiguration
{
    Subject = builder.Configuration["Vapid:Subject"] ?? "",
    PublicKey = builder.Configuration["Vapid:PublicKey"] ?? "",
    PrivateKey = builder.Configuration["Vapid:PrivateKey"] ?? "",
};
builder.Services.AddSingleton(vapid);
builder.Services.AddSingleton<WebPushService>();

// SignalR
builder.Services.AddSignalR();

// Controllers
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
        options.SerializerSettings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter()));

var app = builder.Build();

// Only redirect to HTTPS when not running in a container behind a proxy
if (!app.Environment.IsProduction())
    app.UseHttpsRedirection();
app.UseDefaultFiles();   // serves index.html for "/"
// Service worker must not be cached by the HTTP cache so the browser always
// checks for updates. All other static assets use the default (content-addressed
// filenames from Vite, so long-lived caching is safe).
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name == "sw.js")
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    }
});
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<EncounterHub>("/hubs/encounter");
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapFallbackToFile("index.html"); // SPA fallback — client-side routing

// Run migrations on every startup (safe — EF skips already-applied migrations)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DataSeeder.SeedAdminAsync(scope.ServiceProvider);
}

app.Run();
