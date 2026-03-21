using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class SpellsPerDayEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }
    public int SpellLevel { get; set; }
    public int MaxSlots { get; set; }
    public int UsedSlots { get; set; }
    public DateOnly Date { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
}
