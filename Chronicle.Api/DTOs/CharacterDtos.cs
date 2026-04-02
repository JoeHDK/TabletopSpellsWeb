using System.ComponentModel.DataAnnotations;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.DTOs;

public class CharacterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public Class CharacterClass { get; set; }
    public Subclass Subclass { get; set; }
    public Game GameType { get; set; }
    public int Level { get; set; }
    public bool IsDivineCaster { get; set; }
    public Dictionary<string, int> AbilityScores { get; set; } = new();
    public Dictionary<int, int> MaxSpellsPerDay { get; set; } = new();
    public Dictionary<int, int> SpellsUsedToday { get; set; } = new();
    public List<string> AlwaysPreparedSpells { get; set; } = new();
    public List<string> SavingThrowProficiencies { get; set; } = new();
    public List<string> SkillProficiencies { get; set; } = new();
    public List<string> ClassSkillProficiencies { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int MaxHp { get; set; }
    public int CurrentHp { get; set; }
    public int BaseArmorClass { get; set; }
    public Guid? GameRoomId { get; set; }
    public string? AvatarBase64 { get; set; }
    public bool IsNpc { get; set; }
    public int WildShapeUsesRemaining { get; set; }
    public string? WildShapeBeastName { get; set; }
    public int? WildShapeBeastCurrentHp { get; set; }
    public int? WildShapeBeastMaxHp { get; set; }
    public string? Race { get; set; }
    public string? Background { get; set; }
    // Roleplay / Characteristics
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

public class UpdateCharacteristicsRequest
{
    [StringLength(100)]
    public string? Background { get; set; }
    [StringLength(500)]
    public string? PersonalityTraits { get; set; }
    [StringLength(500)]
    public string? Ideals { get; set; }
    [StringLength(500)]
    public string? Bonds { get; set; }
    [StringLength(500)]
    public string? Flaws { get; set; }
    [StringLength(50000)]
    public string? Backstory { get; set; }
    [StringLength(2000)]
    public string? Appearance { get; set; }
    [StringLength(50)]
    public string? Age { get; set; }
    [StringLength(50)]
    public string? Height { get; set; }
    [StringLength(50)]
    public string? Weight { get; set; }
    [StringLength(50)]
    public string? Eyes { get; set; }
    [StringLength(50)]
    public string? Hair { get; set; }
    [StringLength(50)]
    public string? Skin { get; set; }
    [StringLength(2000)]
    public string? AlliesAndOrganizations { get; set; }
}

public class CreateCharacterRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }
    public Class CharacterClass { get; set; }
    public Subclass Subclass { get; set; } = Subclass.None;
    public Game GameType { get; set; }
    [Range(1, 20)]
    public int Level { get; set; } = 1;
    public Dictionary<string, int>? AbilityScores { get; set; }
    public bool IsNpc { get; set; } = false;
    public string? Race { get; set; }
}

public class UpdateCharacterRequest
{
    [StringLength(100, MinimumLength = 1)]
    public string? Name { get; set; }
    [Range(1, 20)]
    public int? Level { get; set; }
    public Subclass? Subclass { get; set; }
    public Dictionary<string, int>? AbilityScores { get; set; }
    public Dictionary<int, int>? MaxSpellsPerDay { get; set; }
    public Dictionary<int, int>? SpellsUsedToday { get; set; }
    [Range(0, 30)]
    public int? BaseArmorClass { get; set; }
    public List<string>? SavingThrowProficiencies { get; set; }
    public List<string>? SkillProficiencies { get; set; }
    public List<string>? ClassSkillProficiencies { get; set; }
    public string? Race { get; set; }
}

public class UpdateHpRequest
{
    [Range(0, 9999)]
    public int CurrentHp { get; set; }
    [Range(0, 9999)]
    public int? MaxHp { get; set; }
}

public class SendItemRequest
{
    public Guid RecipientCharacterId { get; set; }
}

public class CharacterAttackDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? DamageFormula { get; set; }
    public string? DamageType { get; set; }
    public string AbilityMod { get; set; } = "Strength";
    public bool UseProficiency { get; set; }
    public int MagicBonus { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
}

public class AddAttackRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }
    [StringLength(50)]
    public string? DamageFormula { get; set; }
    [StringLength(50)]
    public string? DamageType { get; set; }
    public string AbilityMod { get; set; } = "Strength";
    public bool UseProficiency { get; set; } = true;
    public int MagicBonus { get; set; } = 0;
    [StringLength(500)]
    public string? Notes { get; set; }
    public int SortOrder { get; set; } = 0;
}

public class UpdateAttackRequest : AddAttackRequest { }

public class PartyMemberDto
{
    public Guid CharacterId { get; set; }
    public string CharacterName { get; set; } = "";
    public string OwnerUsername { get; set; } = "";
    public string OwnerUserId { get; set; } = "";
    public string CharacterClass { get; set; } = "";
    public int Level { get; set; }
    public int CurrentHp { get; set; }
    public int MaxHp { get; set; }
    public int BaseArmorClass { get; set; }
    public int EquipmentAcBonus { get; set; }
    public int PassivePerception { get; set; }
    public Dictionary<int, int> SpellSlotsRemaining { get; set; } = new();
}
