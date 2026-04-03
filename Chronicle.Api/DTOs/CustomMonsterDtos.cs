using System.ComponentModel.DataAnnotations;

namespace Chronicle.Api.DTOs;

public class MonsterAttackDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    public int? AttackBonus { get; set; }
    [MaxLength(100)] public string? Range { get; set; }
    [MaxLength(50)] public string? HitDamage { get; set; }
    [MaxLength(50)] public string? DamageType { get; set; }
    [MaxLength(2_000)] public string? Description { get; set; }
}

public class MonsterSpellDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(200)] public string? UsageNote { get; set; }
}

public class CustomMonsterDto
{
    public Guid Id { get; set; }
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
    public List<MonsterAttackDto> Attacks { get; set; } = [];
    public List<MonsterSpellDto> Spells { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SaveCustomMonsterRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string Type { get; set; } = "humanoid";
    [Range(0, 30)] public double ChallengeRating { get; set; }
    [Range(1, 99999)] public int HitPoints { get; set; }
    [Range(0, 99)] public int ArmorClass { get; set; }
    [MaxLength(100)] public string Speed { get; set; } = "30 ft.";
    [MaxLength(50)] public string Size { get; set; } = "Medium";
    [Range(1, 30)] public int Strength { get; set; } = 10;
    [Range(1, 30)] public int Dexterity { get; set; } = 10;
    [Range(1, 30)] public int Constitution { get; set; } = 10;
    [Range(1, 30)] public int Intelligence { get; set; } = 10;
    [Range(1, 30)] public int Wisdom { get; set; } = 10;
    [Range(1, 30)] public int Charisma { get; set; } = 10;
    [MaxLength(10_000)] public string? Description { get; set; }
    [MaxLength(50)] public List<MonsterAttackDto> Attacks { get; set; } = [];
    [MaxLength(50)] public List<MonsterSpellDto> Spells { get; set; } = [];
}
