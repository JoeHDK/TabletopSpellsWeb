namespace Chronicle.Api.DTOs;

public class MonsterAttackDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public int? AttackBonus { get; set; }
    public string? Range { get; set; }
    public string? HitDamage { get; set; }
    public string? DamageType { get; set; }
    public string? Description { get; set; }
}

public class MonsterSpellDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string? UsageNote { get; set; }
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
}
