using TabletopSpells.Api.Data.Entities;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.DTOs;

public class GameRoomDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string DmUserId { get; set; } = "";
    public string DmUsername { get; set; } = "";
    public string InviteCode { get; set; } = "";
    public GameRole MyRole { get; set; }
    public List<GameMemberDto> Members { get; set; } = [];
    public List<GameCharacterDto> Characters { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class GameMemberDto
{
    public string UserId { get; set; } = "";
    public string Username { get; set; } = "";
    public GameRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class GameCharacterDto
{
    public Guid CharacterId { get; set; }
    public string CharacterName { get; set; } = "";
    public string OwnerUsername { get; set; } = "";
    public string CharacterClass { get; set; } = "";
    public int Level { get; set; }
}

public class GameSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string DmUsername { get; set; } = "";
    public GameRole MyRole { get; set; }
    public int MemberCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateGameRequest
{
    public required string Name { get; set; }
}

public class JoinGameRequest
{
    public required string InviteCode { get; set; }
}

public class AddMemberRequest
{
    public required string Username { get; set; }
}

public class LinkCharacterRequest
{
    public Guid CharacterId { get; set; }
}

public class GiveItemRequest
{
    public Guid RecipientCharacterId { get; set; }
    public ItemSource ItemSource { get; set; }
    public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }
    public required string Name { get; set; }
    public int Quantity { get; set; } = 1;
    public int? AcBonus { get; set; }
    public string? DamageOverride { get; set; }
    public string? Notes { get; set; }
}
