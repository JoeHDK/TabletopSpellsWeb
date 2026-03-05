using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class CharacterThemeEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public Guid CharacterId { get; set; }
    [Required] public required string ThemeName { get; set; }
    [Column(TypeName = "jsonb")] public string CustomColorsJson { get; set; } = "{}";

    [ForeignKey(nameof(CharacterId))] public CharacterEntity? Character { get; set; }
}
