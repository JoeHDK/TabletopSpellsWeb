using Newtonsoft.Json;

namespace TabletopSpells.Api.Models;

public class FeatPrerequisite
{
    [JsonProperty("type")] public string Type { get; set; } = "";
    [JsonProperty("ability")] public string? Ability { get; set; }
    [JsonProperty("minimum_score")] public int? MinimumScore { get; set; }
    [JsonProperty("proficiency")] public string? Proficiency { get; set; }
}

public class FeatModifier
{
    /// <summary>
    /// Type: "initiative", "ac", "hp_per_level", "passive_perception", "passive_investigation",
    ///       "movement", "medium_armor_max_dex", "damage_reduction"
    /// </summary>
    [JsonProperty("type")] public string Type { get; set; } = "";
    [JsonProperty("value")] public int Value { get; set; }
    [JsonProperty("condition")] public string? Condition { get; set; }
    [JsonProperty("damageTypes")] public List<string>? DamageTypes { get; set; }
}

public class Feat
{
    [JsonProperty("index")] public string Index { get; set; } = "";
    [JsonProperty("name")] public string Name { get; set; } = "";
    [JsonProperty("desc")] public List<string> Desc { get; set; } = [];
    [JsonProperty("prerequisites")] public List<FeatPrerequisite> Prerequisites { get; set; } = [];
    [JsonProperty("modifiers")] public List<FeatModifier> Modifiers { get; set; } = [];
}
