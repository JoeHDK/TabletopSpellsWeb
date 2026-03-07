using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TabletopSpells.Api.Data.Entities;

public class GameRoomEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public required string Name { get; set; }
    [Required] public required string DmUserId { get; set; }
    [Required] public required string InviteCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(DmUserId))] public AppUser? DmUser { get; set; }
    public ICollection<GameMemberEntity> Members { get; set; } = new List<GameMemberEntity>();
    public ICollection<CharacterEntity> Characters { get; set; } = new List<CharacterEntity>();
}
