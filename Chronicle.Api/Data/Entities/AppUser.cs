using Microsoft.AspNetCore.Identity;

namespace Chronicle.Api.Data.Entities;

public class AppUser : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsAdmin { get; set; }
    public bool IsDm { get; set; }
    public ICollection<CharacterEntity> Characters { get; set; } = new List<CharacterEntity>();
    public ICollection<CustomItemEntity> CustomItems { get; set; } = new List<CustomItemEntity>();
    public ICollection<GameMemberEntity> GameMemberships { get; set; } = new List<GameMemberEntity>();
}
