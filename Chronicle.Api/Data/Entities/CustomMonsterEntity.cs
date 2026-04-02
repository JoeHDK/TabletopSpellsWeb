using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Chronicle.Api.Data.Entities;

public class CustomMonsterEntity
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public required string UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "humanoid";
    public double ChallengeRating { get; set; }
    public int HitPoints { get; set; }
    public int ArmorClass { get; set; }
    public string Speed { get; set; } = "30 ft.";
    public string Size { get; set; } = "Medium";
    public int Strength { get; set; } = 10;
    public int Dexterity { get; set; } = 10;
    public int Constitution { get; set; } = 10;
    public int Intelligence { get; set; } = 10;
    public int Wisdom { get; set; } = 10;
    public int Charisma { get; set; } = 10;
    public string? Description { get; set; }
    public string AttacksJson { get; set; } = "[]";
    public string SpellsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))] public AppUser? User { get; set; }
}
