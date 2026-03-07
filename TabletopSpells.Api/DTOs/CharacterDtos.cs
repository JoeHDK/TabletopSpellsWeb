using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.DTOs;

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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int MaxHp { get; set; }
    public int CurrentHp { get; set; }
    public int BaseArmorClass { get; set; }
    public Guid? GameRoomId { get; set; }
}

public class CreateCharacterRequest
{
    public required string Name { get; set; }
    public Class CharacterClass { get; set; }
    public Subclass Subclass { get; set; } = Subclass.None;
    public Game GameType { get; set; }
    public int Level { get; set; } = 1;
    public Dictionary<string, int>? AbilityScores { get; set; }
}

public class UpdateCharacterRequest
{
    public string? Name { get; set; }
    public int? Level { get; set; }
    public Subclass? Subclass { get; set; }
    public Dictionary<string, int>? AbilityScores { get; set; }
    public Dictionary<int, int>? MaxSpellsPerDay { get; set; }
    public Dictionary<int, int>? SpellsUsedToday { get; set; }
    public int? BaseArmorClass { get; set; }
}

public class UpdateHpRequest
{
    public int CurrentHp { get; set; }
    public int? MaxHp { get; set; }
}

public class SendItemRequest
{
    public Guid RecipientCharacterId { get; set; }
}

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
