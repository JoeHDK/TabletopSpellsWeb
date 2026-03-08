using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class EncounterTemplateCreatureEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid TemplateId { get; set; }
    [ForeignKey(nameof(TemplateId))] public EncounterTemplateEntity? Template { get; set; }

    [Required, MaxLength(200)] public required string DisplayName { get; set; }
    [MaxLength(200)] public string? MonsterName { get; set; }
    public int MaxHp { get; set; }
    public int ArmorClass { get; set; }
    public int SortOrder { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
}
