using Newtonsoft.Json;

namespace TabletopSpells.Api.Models;

public class Monster
{
    [JsonProperty("name")] public string Name { get; set; } = "";
    [JsonProperty("type")] public string Type { get; set; } = "";
    [JsonProperty("subtype")] public string? Subtype { get; set; }
    [JsonProperty("cr")] public double Cr { get; set; }
    [JsonProperty("size")] public string Size { get; set; } = "";
    [JsonProperty("ac")] public int Ac { get; set; }
    [JsonProperty("acNote")] public string? AcNote { get; set; }
    [JsonProperty("hp")] public int Hp { get; set; }
    [JsonProperty("hitDice")] public string? HitDice { get; set; }
    [JsonProperty("str")] public int Str { get; set; }
    [JsonProperty("dex")] public int Dex { get; set; }
    [JsonProperty("con")] public int Con { get; set; }
    [JsonProperty("int")] public int Int { get; set; }
    [JsonProperty("wis")] public int Wis { get; set; }
    [JsonProperty("cha")] public int Cha { get; set; }
    [JsonProperty("walkSpeed")] public int WalkSpeed { get; set; }
    [JsonProperty("flySpeed")] public int FlySpeed { get; set; }
    [JsonProperty("swimSpeed")] public int SwimSpeed { get; set; }
    [JsonProperty("climbSpeed")] public int ClimbSpeed { get; set; }
    [JsonProperty("burrowSpeed")] public int BurrowSpeed { get; set; }
    [JsonProperty("savingThrows")] public List<string> SavingThrows { get; set; } = new();
    [JsonProperty("skills")] public List<string> Skills { get; set; } = new();
    [JsonProperty("damageImmunities")] public List<string> DamageImmunities { get; set; } = new();
    [JsonProperty("damageResistances")] public List<string> DamageResistances { get; set; } = new();
    [JsonProperty("damageVulnerabilities")] public List<string> DamageVulnerabilities { get; set; } = new();
    [JsonProperty("conditionImmunities")] public List<string> ConditionImmunities { get; set; } = new();
    [JsonProperty("senses")] public string? Senses { get; set; }
    [JsonProperty("languages")] public string? Languages { get; set; }
    [JsonProperty("traits")] public List<MonsterTrait> Traits { get; set; } = new();
    [JsonProperty("actions")] public List<MonsterAction> Actions { get; set; } = new();
    [JsonProperty("legendaryActions")] public List<MonsterAction> LegendaryActions { get; set; } = new();
    [JsonProperty("source")] public string Source { get; set; } = "SRD";
}

public class MonsterTrait
{
    [JsonProperty("name")] public string Name { get; set; } = "";
    [JsonProperty("description")] public string Description { get; set; } = "";
}

public class MonsterAction
{
    [JsonProperty("name")] public string Name { get; set; } = "";
    [JsonProperty("description")] public string Description { get; set; } = "";
}
