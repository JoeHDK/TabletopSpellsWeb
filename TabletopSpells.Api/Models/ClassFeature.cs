using System.Text.Json.Serialization;

namespace TabletopSpells.Api.Models;

public class ClassFeature
{
    [JsonPropertyName("index")] public string Index { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("class")] public string Class { get; set; } = "";
    [JsonPropertyName("subclass")] public string? Subclass { get; set; }
    [JsonPropertyName("min_level")] public int MinLevel { get; set; } = 1;
    [JsonPropertyName("desc")] public List<string> Desc { get; set; } = new();
    [JsonPropertyName("is_passive")] public bool IsPassive { get; set; }
    [JsonPropertyName("modifiers")] public List<ClassFeatureModifier> Modifiers { get; set; } = new();
}

public class ClassFeatureModifier
{
    [JsonPropertyName("type")] public string Type { get; set; } = "";
    [JsonPropertyName("value")] public int Value { get; set; }
    [JsonPropertyName("condition")] public string? Condition { get; set; }
}
