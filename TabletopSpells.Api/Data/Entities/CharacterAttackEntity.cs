namespace TabletopSpells.Api.Data.Entities;

public class CharacterAttackEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CharacterId { get; set; }
    public CharacterEntity? Character { get; set; }

    public required string Name { get; set; }
    public string? DamageFormula { get; set; }
    public string? DamageType { get; set; }

    /// <summary>Ability score key used for attack/damage modifier (e.g. "Strength", "Dexterity").</summary>
    public string AbilityMod { get; set; } = "Strength";
    public bool UseProficiency { get; set; } = true;
    public int MagicBonus { get; set; } = 0;
    public string? Notes { get; set; }
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
