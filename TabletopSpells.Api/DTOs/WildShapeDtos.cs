namespace TabletopSpells.Api.DTOs;

public class BeastAttackDto
{
    public string Name { get; set; } = "";
    public string Dice { get; set; } = "";
    public string Type { get; set; } = "";
    public string Stat { get; set; } = "str";
}

public class BeastDto
{
    public string Name { get; set; } = "";
    public double Cr { get; set; }
    public string Size { get; set; } = "";
    public int Ac { get; set; }
    public int Hp { get; set; }
    public int Str { get; set; }
    public int Dex { get; set; }
    public int Con { get; set; }
    public int WalkSpeed { get; set; }
    public int FlySpeed { get; set; }
    public int SwimSpeed { get; set; }
    public int ClimbSpeed { get; set; }
    public string Source { get; set; } = "";
    public List<BeastAttackDto> Attacks { get; set; } = new();
}

public class WildShapeActionRequest
{
    /// <summary>enter | revert | damage | heal | restoreUses</summary>
    public required string Action { get; set; }
    public string? BeastName { get; set; }
    public int? BeastMaxHp { get; set; }
    public int? BeastCurrentHp { get; set; }
    public int? Amount { get; set; }
}
