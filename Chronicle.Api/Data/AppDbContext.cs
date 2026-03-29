using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data.Entities;

namespace Chronicle.Api.Data;

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
    public DbSet<CharacterAttackEntity> CharacterAttacks => Set<CharacterAttackEntity>();
    public DbSet<ChatConversationEntity> ChatConversations => Set<ChatConversationEntity>();
    public DbSet<ChatParticipantEntity> ChatParticipants => Set<ChatParticipantEntity>();
    public DbSet<ChatMessageEntity> ChatMessages => Set<ChatMessageEntity>();
    public DbSet<FriendshipEntity> Friendships => Set<FriendshipEntity>();
    public DbSet<EncounterEntity> Encounters => Set<EncounterEntity>();
    public DbSet<EncounterCreatureEntity> EncounterCreatures => Set<EncounterCreatureEntity>();
    public DbSet<SessionNoteEntity> SessionNotes => Set<SessionNoteEntity>();
    public DbSet<EncounterTemplateEntity> EncounterTemplates => Set<EncounterTemplateEntity>();
    public DbSet<EncounterTemplateCreatureEntity> EncounterTemplateCreatures => Set<EncounterTemplateCreatureEntity>();
    public DbSet<CharacterFeatEntity> CharacterFeats => Set<CharacterFeatEntity>();
    public DbSet<ClassResourceEntity> ClassResources => Set<ClassResourceEntity>();
    public DbSet<GameLootItemEntity> GameLootItems => Set<GameLootItemEntity>();
    public DbSet<PushSubscriptionEntity> PushSubscriptions => Set<PushSubscriptionEntity>();

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

        builder.Entity<CharacterAttackEntity>()
            .HasOne(a => a.Character)
            .WithMany(c => c.Attacks)
            .HasForeignKey(a => a.CharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ChatConversationEntity>()
            .HasOne(c => c.GameRoom)
            .WithMany()
            .HasForeignKey(c => c.GameRoomId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);

        builder.Entity<ChatConversationEntity>()
            .HasOne(c => c.CreatedBy)
            .WithMany()
            .HasForeignKey(c => c.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ChatParticipantEntity>()
            .HasOne(p => p.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(p => p.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ChatParticipantEntity>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ChatParticipantEntity>()
            .HasIndex(p => new { p.ConversationId, p.UserId })
            .IsUnique();

        builder.Entity<ChatMessageEntity>()
            .HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ChatMessageEntity>()
            .HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ChatMessageEntity>()
            .HasIndex(m => new { m.ConversationId, m.SentAt });

        builder.Entity<FriendshipEntity>()
            .HasOne(f => f.Requester)
            .WithMany()
            .HasForeignKey(f => f.RequesterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<FriendshipEntity>()
            .HasOne(f => f.Addressee)
            .WithMany()
            .HasForeignKey(f => f.AddresseeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Each pair of users can only have one friendship row (in either direction)
        builder.Entity<FriendshipEntity>()
            .HasIndex(f => new { f.RequesterId, f.AddresseeId })
            .IsUnique();

        builder.Entity<EncounterEntity>()
            .HasOne(e => e.GameRoom)
            .WithMany()
            .HasForeignKey(e => e.GameRoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<EncounterCreatureEntity>()
            .HasOne(c => c.Encounter)
            .WithMany(e => e.Creatures)
            .HasForeignKey(c => c.EncounterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SessionNoteEntity>()
            .HasOne(n => n.GameRoom)
            .WithMany()
            .HasForeignKey(n => n.GameRoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<EncounterTemplateEntity>()
            .HasOne(t => t.GameRoom)
            .WithMany()
            .HasForeignKey(t => t.GameRoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<EncounterTemplateEntity>()
            .HasOne(t => t.Session)
            .WithMany()
            .HasForeignKey(t => t.SessionNoteId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.Entity<EncounterTemplateCreatureEntity>()
            .HasOne(c => c.Template)
            .WithMany(t => t.Creatures)
            .HasForeignKey(c => c.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ClassResourceEntity>()
            .HasOne(r => r.Character)
            .WithMany()
            .HasForeignKey(r => r.CharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ClassResourceEntity>()
            .HasIndex(r => new { r.CharacterId, r.ResourceKey })
            .IsUnique();

        builder.Entity<GameLootItemEntity>()
            .HasOne(l => l.GameRoom)
            .WithMany()
            .HasForeignKey(l => l.GameRoomId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<GameLootItemEntity>()
            .HasOne(l => l.CustomItem)
            .WithMany()
            .HasForeignKey(l => l.CustomItemId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.Entity<PushSubscriptionEntity>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PushSubscriptionEntity>()
            .HasIndex(p => new { p.UserId, p.Endpoint })
            .IsUnique();
    }
}
