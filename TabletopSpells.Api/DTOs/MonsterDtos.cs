namespace TabletopSpells.Api.DTOs;

public class MonsterSummaryDto
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public string? Subtype { get; set; }
    public double Cr { get; set; }
    public string Size { get; set; } = "";
    public int Ac { get; set; }
    public int Hp { get; set; }
    public string Source { get; set; } = "";
}

public class MonsterDto : MonsterSummaryDto
{
    public string? AcNote { get; set; }
    public string? HitDice { get; set; }
    public int Str { get; set; }
    public int Dex { get; set; }
    public int Con { get; set; }
    public int Int { get; set; }
    public int Wis { get; set; }
    public int Cha { get; set; }
    public int WalkSpeed { get; set; }
    public int FlySpeed { get; set; }
    public int SwimSpeed { get; set; }
    public int ClimbSpeed { get; set; }
    public int BurrowSpeed { get; set; }
    public List<string> SavingThrows { get; set; } = new();
    public List<string> Skills { get; set; } = new();
    public List<string> DamageImmunities { get; set; } = new();
    public List<string> DamageResistances { get; set; } = new();
    public List<string> DamageVulnerabilities { get; set; } = new();
    public List<string> ConditionImmunities { get; set; } = new();
    public string? Senses { get; set; }
    public string? Languages { get; set; }
    public List<MonsterTraitDto> Traits { get; set; } = new();
    public List<MonsterActionDto> Actions { get; set; } = new();
    public List<MonsterActionDto> LegendaryActions { get; set; } = new();
}

public class MonsterTraitDto
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
}

public class MonsterActionDto
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
}
