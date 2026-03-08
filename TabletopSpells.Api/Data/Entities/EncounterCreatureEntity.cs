using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class EncounterCreatureEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid EncounterId { get; set; }
    [ForeignKey(nameof(EncounterId))] public EncounterEntity? Encounter { get; set; }

    [Required, MaxLength(200)] public required string DisplayName { get; set; }
    [MaxLength(200)] public string? MonsterName { get; set; }
    public int MaxHp { get; set; }
    public int CurrentHp { get; set; }
    public int ArmorClass { get; set; }
    public int? Initiative { get; set; }
    public int SortOrder { get; set; }
    public bool IsPlayerCharacter { get; set; }
    public Guid? CharacterId { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
}
