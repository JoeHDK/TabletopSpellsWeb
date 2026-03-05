using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class PreparedSpellEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }
    [Required] public required string SpellId { get; set; }
    public bool IsPrepared { get; set; }
    public bool IsAlwaysPrepared { get; set; }
    public bool IsFavorite { get; set; }
    public bool IsDomainSpell { get; set; }

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
}
