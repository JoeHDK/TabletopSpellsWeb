using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.Data.Entities;

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

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))] public AppUser? User { get; set; }
    public ICollection<PreparedSpellEntity> PreparedSpells { get; set; } = new List<PreparedSpellEntity>();
    public ICollection<SpellsPerDayEntity> SpellsPerDay { get; set; } = new List<SpellsPerDayEntity>();
    public ICollection<SpellCastLogEntity> SpellCastLogs { get; set; } = new List<SpellCastLogEntity>();
    public ICollection<CharacterThemeEntity> Themes { get; set; } = new List<CharacterThemeEntity>();
}
