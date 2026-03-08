using System.Text.Json.Serialization;

namespace TabletopSpells.Api.Models;

public class Race
{
    [JsonPropertyName("index")] public string Index { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("parent_race")] public string? ParentRace { get; set; }
    [JsonPropertyName("speed")] public int Speed { get; set; } = 30;
    [JsonPropertyName("size")] public string Size { get; set; } = "Medium";
    [JsonPropertyName("desc")] public List<string> Desc { get; set; } = new();
    [JsonPropertyName("traits")] public List<RaceTrait> Traits { get; set; } = new();
    [JsonPropertyName("modifiers")] public List<RaceModifier> Modifiers { get; set; } = new();
}

public class RaceTrait
{
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("desc")] public string Desc { get; set; } = "";
}

public class RaceModifier
{
    [JsonPropertyName("type")] public string Type { get; set; } = "";
    [JsonPropertyName("ability")] public string? Ability { get; set; }
    [JsonPropertyName("value")] public int Value { get; set; }
    [JsonPropertyName("condition")] public string? Condition { get; set; }
}
