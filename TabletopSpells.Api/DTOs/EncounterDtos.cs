namespace TabletopSpells.Api.DTOs;

public class EncounterDto
{
    public Guid Id { get; set; }
    public Guid GameRoomId { get; set; }
    public string? Name { get; set; }
    public bool IsActive { get; set; }
    public int RoundNumber { get; set; }
    public int ActiveCreatureIndex { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<EncounterCreatureDto> Creatures { get; set; } = new();
}

public class EncounterCreatureDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = "";
    public string? MonsterName { get; set; }
    public int MaxHp { get; set; }
    public int CurrentHp { get; set; }
    public int ArmorClass { get; set; }
    public int? Initiative { get; set; }
    public int SortOrder { get; set; }
    public bool IsPlayerCharacter { get; set; }
    public Guid? CharacterId { get; set; }
    public string? Notes { get; set; }
}

public class CreateEncounterRequest
{
    public string? Name { get; set; }
}

public class AddEncounterCreatureRequest
{
    public required string DisplayName { get; set; }
    public string? MonsterName { get; set; }
    public int MaxHp { get; set; }
    public int ArmorClass { get; set; }
    public int? Initiative { get; set; }
    public bool IsPlayerCharacter { get; set; }
    public Guid? CharacterId { get; set; }
    public string? Notes { get; set; }
}

public class UpdateEncounterCreatureRequest
{
    public int? CurrentHp { get; set; }
    public int? MaxHp { get; set; }
    public int? Initiative { get; set; }
    public int? SortOrder { get; set; }
    public string? Notes { get; set; }
}

public class AddPlayersRequest
{
    public List<Guid> CharacterIds { get; set; } = new();
}
