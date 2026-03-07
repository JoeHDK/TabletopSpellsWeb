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
    public DbSet<CustomItemEntity> CustomItems => Set<CustomItemEntity>();
    public DbSet<GameRoomEntity> GameRooms => Set<GameRoomEntity>();
    public DbSet<GameMemberEntity> GameMembers => Set<GameMemberEntity>();
    public DbSet<CharacterInventoryItemEntity> InventoryItems => Set<CharacterInventoryItemEntity>();
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();

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

        builder.Entity<CustomItemEntity>()
            .HasOne(i => i.User)
            .WithMany(u => u.CustomItems)
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<GameRoomEntity>()
            .HasOne(g => g.DmUser)
            .WithMany()
            .HasForeignKey(g => g.DmUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<GameMemberEntity>()
            .HasOne(m => m.GameRoom)
            .WithMany(g => g.Members)
            .HasForeignKey(m => m.GameRoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<GameMemberEntity>()
            .HasOne(m => m.User)
            .WithMany(u => u.GameMemberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<CharacterEntity>()
            .HasOne(c => c.GameRoom)
            .WithMany(g => g.Characters)
            .HasForeignKey(c => c.GameRoomId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.Entity<GameMemberEntity>()
            .HasIndex(m => new { m.GameRoomId, m.UserId })
            .IsUnique();

        builder.Entity<GameRoomEntity>()
            .HasIndex(g => g.InviteCode)
            .IsUnique();

        builder.Entity<CharacterInventoryItemEntity>()
            .HasOne(i => i.Character)
            .WithMany(c => c.Inventory)
            .HasForeignKey(i => i.CharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CharacterInventoryItemEntity>()
            .HasOne(i => i.CustomItem)
            .WithMany()
            .HasForeignKey(i => i.CustomItemId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.Entity<CharacterInventoryItemEntity>()
            .HasOne(i => i.GrantedBy)
            .WithMany()
            .HasForeignKey(i => i.GrantedByUserId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.Entity<NotificationEntity>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
