using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TabletopSpells.Api.Data.Entities;

namespace TabletopSpells.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<CharacterEntity> Characters => Set<CharacterEntity>();
    public DbSet<PreparedSpellEntity> PreparedSpells => Set<PreparedSpellEntity>();
    public DbSet<SpellsPerDayEntity> SpellsPerDay => Set<SpellsPerDayEntity>();
    public DbSet<SpellCastLogEntity> SpellCastLogs => Set<SpellCastLogEntity>();
    public DbSet<CharacterThemeEntity> CharacterThemes => Set<CharacterThemeEntity>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<CharacterEntity>()
            .HasOne(c => c.User)
            .WithMany(u => u.Characters)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PreparedSpellEntity>()
            .HasOne(p => p.Character)
            .WithMany(c => c.PreparedSpells)
            .HasForeignKey(p => p.CharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SpellsPerDayEntity>()
            .HasOne(s => s.Character)
            .WithMany(c => c.SpellsPerDay)
            .HasForeignKey(s => s.CharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SpellCastLogEntity>()
            .HasOne(l => l.Character)
            .WithMany(c => c.SpellCastLogs)
            .HasForeignKey(l => l.CharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CharacterThemeEntity>()
            .HasOne(t => t.Character)
            .WithMany(c => c.Themes)
            .HasForeignKey(t => t.CharacterId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
