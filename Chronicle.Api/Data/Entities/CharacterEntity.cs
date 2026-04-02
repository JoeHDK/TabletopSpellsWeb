using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Data.Entities;

public class CharacterEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public required string UserId { get; set; }
    [Required] public required string Name { get; set; }
    public Class CharacterClass { get; set; }
    public Subclass Subclass { get; set; } = Subclass.None;
    public Game GameType { get; set; }
    public int Level { get; set; } = 1;
    public bool IsDivineCaster { get; set; }

    // Stored as JSON columns in PostgreSQL
    [Column(TypeName = "jsonb")] public string AbilityScoresJson { get; set; } = "{}";
    [Column(TypeName = "jsonb")] public string MaxSpellsPerDayJson { get; set; } = "{}";
    [Column(TypeName = "jsonb")] public string SpellsUsedTodayJson { get; set; } = "{}";
    [Column(TypeName = "jsonb")] public string AlwaysPreparedSpellsJson { get; set; } = "[]";
    [Column(TypeName = "jsonb")] public string SavingThrowProficienciesJson { get; set; } = "[]";
    [Column(TypeName = "jsonb")] public string SkillProficienciesJson { get; set; } = "[]";
    [Column(TypeName = "jsonb")] public string ClassSkillProficienciesJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int MaxHp { get; set; }
    public int CurrentHp { get; set; }
    public int BaseArmorClass { get; set; } = 0;

    public Guid? GameRoomId { get; set; }
    [ForeignKey(nameof(GameRoomId))] public GameRoomEntity? GameRoom { get; set; }

    public string? AvatarBase64 { get; set; }
    public bool IsNpc { get; set; } = false;
    public string? Race { get; set; }
    public string? Background { get; set; }

    // Wild Shape state (Druid only)
    public int WildShapeUsesRemaining { get; set; } = 2;
    public string? WildShapeBeastName { get; set; }
    public int? WildShapeBeastCurrentHp { get; set; }
    public int? WildShapeBeastMaxHp { get; set; }

    [ForeignKey(nameof(UserId))] public AppUser? User { get; set; }
    public ICollection<PreparedSpellEntity> PreparedSpells { get; set; } = new List<PreparedSpellEntity>();
    public ICollection<SpellsPerDayEntity> SpellsPerDay { get; set; } = new List<SpellsPerDayEntity>();
    public ICollection<SpellCastLogEntity> SpellCastLogs { get; set; } = new List<SpellCastLogEntity>();
    public ICollection<CharacterThemeEntity> Themes { get; set; } = new List<CharacterThemeEntity>();
    public ICollection<CharacterInventoryItemEntity> Inventory { get; set; } = new List<CharacterInventoryItemEntity>();
    public ICollection<CharacterAttackEntity> Attacks { get; set; } = new List<CharacterAttackEntity>();

    // ── Roleplay / Characteristics (D&D 5e character sheet fields) ────────────
    public string? PersonalityTraits { get; set; }
    public string? Ideals { get; set; }
    public string? Bonds { get; set; }
    public string? Flaws { get; set; }
    public string? Backstory { get; set; }
    public string? Appearance { get; set; }
    public string? Age { get; set; }
    public string? Height { get; set; }
    public string? Weight { get; set; }
    public string? Eyes { get; set; }
    public string? Hair { get; set; }
    public string? Skin { get; set; }
    public string? AlliesAndOrganizations { get; set; }
}
