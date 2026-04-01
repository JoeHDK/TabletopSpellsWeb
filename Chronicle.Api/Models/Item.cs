using Newtonsoft.Json;

namespace Chronicle.Api.Models;

public class Item
{
    [JsonProperty("index")] public string? Index { get; set; }
    [JsonProperty("name")] public string? Name { get; set; }
    [JsonProperty("item_type")] public string? ItemType { get; set; }
    [JsonProperty("category")] public string? Category { get; set; }
    [JsonProperty("rarity")] public string? Rarity { get; set; }
    [JsonProperty("description")] public string? Description { get; set; }
    [JsonProperty("requires_attunement")] public bool RequiresAttunement { get; set; }
    [JsonProperty("attunement_note")] public string? AttunementNote { get; set; }
    [JsonProperty("cost")] public string? Cost { get; set; }
    [JsonProperty("weight")] public double? Weight { get; set; }
    [JsonProperty("damage")] public string? Damage { get; set; }
    [JsonProperty("properties")] public List<string>? Properties { get; set; }
    [JsonProperty("source")] public string? Source { get; set; }
}
