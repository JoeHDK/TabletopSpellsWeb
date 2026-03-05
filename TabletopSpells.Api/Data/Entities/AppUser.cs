using Microsoft.AspNetCore.Identity;

namespace TabletopSpells.Api.Data.Entities;

public class AppUser : IdentityUser
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<CharacterEntity> Characters { get; set; } = new List<CharacterEntity>();
}
