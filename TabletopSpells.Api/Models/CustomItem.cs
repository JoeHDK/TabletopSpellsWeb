using Newtonsoft.Json;

namespace TabletopSpells.Api.Models;

public class CustomItemDto
{
    [JsonProperty("id")] public Guid Id { get; set; }
    [JsonProperty("name")] public string Name { get; set; } = "";
    [JsonProperty("item_type")] public string ItemType { get; set; } = "magic";
    [JsonProperty("category")] public string? Category { get; set; }
    [JsonProperty("rarity")] public string? Rarity { get; set; }
    [JsonProperty("description")] public string? Description { get; set; }
    [JsonProperty("requires_attunement")] public bool RequiresAttunement { get; set; }
    [JsonProperty("attunement_note")] public string? AttunementNote { get; set; }
    [JsonProperty("cost")] public string? Cost { get; set; }
    [JsonProperty("weight")] public double? Weight { get; set; }
    [JsonProperty("damage")] public string? Damage { get; set; }
    [JsonProperty("properties")] public List<string> Properties { get; set; } = [];
    [JsonProperty("createdAt")] public DateTime CreatedAt { get; set; }
}

public class SaveCustomItemRequest
{
    [JsonProperty("name")] public required string Name { get; set; }
    [JsonProperty("item_type")] public string ItemType { get; set; } = "magic";
    [JsonProperty("category")] public string? Category { get; set; }
    [JsonProperty("rarity")] public string? Rarity { get; set; }
    [JsonProperty("description")] public string? Description { get; set; }
    [JsonProperty("requires_attunement")] public bool RequiresAttunement { get; set; }
    [JsonProperty("attunement_note")] public string? AttunementNote { get; set; }
    [JsonProperty("cost")] public string? Cost { get; set; }
    [JsonProperty("weight")] public double? Weight { get; set; }
    [JsonProperty("damage")] public string? Damage { get; set; }
    [JsonProperty("properties")] public List<string> Properties { get; set; } = [];
}
