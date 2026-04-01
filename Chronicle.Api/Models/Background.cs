using System.Text.Json.Serialization;

namespace Chronicle.Api.Models;

public class Background
{
    [JsonPropertyName("index")] public string Index { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("skillProficiencies")] public List<string> SkillProficiencies { get; set; } = new();
    [JsonPropertyName("description")] public string Description { get; set; } = "";
}
