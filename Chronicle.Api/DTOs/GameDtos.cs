using System.ComponentModel.DataAnnotations;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.Models;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.DTOs;

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
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }
}

public class JoinGameRequest
{
    [Required, StringLength(20, MinimumLength = 6)]
    public required string InviteCode { get; set; }
}

public class AddMemberRequest
{
    [Required, StringLength(50, MinimumLength = 3)]
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
    [StringLength(100)]
    public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }
    [Range(1, 9999)]
    public int Quantity { get; set; } = 1;
    [Range(0, 99)]
    public int? AcBonus { get; set; }
    public ArmorType? ArmorType { get; set; }
    [StringLength(100)]
    public string? DamageOverride { get; set; }
    public List<DamageEntryDto>? DamageEntries { get; set; }
    public int? StrBonus { get; set; }
    public int? ConBonus { get; set; }
    public int? DexBonus { get; set; }
    public int? WisBonus { get; set; }
    public int? IntBonus { get; set; }
    public int? ChaBonus { get; set; }
    [StringLength(500)]
    public string? Notes { get; set; }
}

public class CreateLootItemRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; set; }
    public ItemSource ItemSource { get; set; }
    [StringLength(100)]
    public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }
    [Range(1, 9999)]
    public int Quantity { get; set; } = 1;
    [Range(0, 99)]
    public int? AcBonus { get; set; }
    [StringLength(100)]
    public string? DamageOverride { get; set; }
    [StringLength(500)]
    public string? Notes { get; set; }
}

public class LootItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public ItemSource ItemSource { get; set; }
    public string? SrdItemIndex { get; set; }
    public Guid? CustomItemId { get; set; }
    public int Quantity { get; set; }
    public int? AcBonus { get; set; }
    public string? DamageOverride { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
