using Newtonsoft.Json;

namespace Chronicle.Api.Models;

public class DamageEntryDto
{
    [JsonProperty("dice")] public string Dice { get; set; } = "";
    [JsonProperty("damageType")] public string DamageType { get; set; } = "";
}

public class CustomItemAbilityDto
{
    [JsonProperty("name")] public required string Name { get; set; }
    [JsonProperty("spellIndex")] public string? SpellIndex { get; set; }
    [JsonProperty("maxUses")] public int MaxUses { get; set; } = 1;
    [JsonProperty("resetOn")] public string ResetOn { get; set; } = "long_rest";
}

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
    [JsonProperty("damage_entries")] public List<DamageEntryDto>? DamageEntries { get; set; }
    [JsonProperty("abilities")] public List<CustomItemAbilityDto> Abilities { get; set; } = [];
    [JsonProperty("ac_bonus")] public int? AcBonus { get; set; }
    [JsonProperty("str_bonus")] public int? StrBonus { get; set; }
    [JsonProperty("con_bonus")] public int? ConBonus { get; set; }
    [JsonProperty("dex_bonus")] public int? DexBonus { get; set; }
    [JsonProperty("wis_bonus")] public int? WisBonus { get; set; }
    [JsonProperty("int_bonus")] public int? IntBonus { get; set; }
    [JsonProperty("cha_bonus")] public int? ChaBonus { get; set; }
    [JsonProperty("saving_throw_bonus")] public int? SavingThrowBonus { get; set; }
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
    [JsonProperty("damage_entries")] public List<DamageEntryDto>? DamageEntries { get; set; }
    [JsonProperty("abilities")] public List<CustomItemAbilityDto> Abilities { get; set; } = [];
    [JsonProperty("ac_bonus")] public int? AcBonus { get; set; }
    [JsonProperty("str_bonus")] public int? StrBonus { get; set; }
    [JsonProperty("con_bonus")] public int? ConBonus { get; set; }
    [JsonProperty("dex_bonus")] public int? DexBonus { get; set; }
    [JsonProperty("wis_bonus")] public int? WisBonus { get; set; }
    [JsonProperty("int_bonus")] public int? IntBonus { get; set; }
    [JsonProperty("cha_bonus")] public int? ChaBonus { get; set; }
    [JsonProperty("saving_throw_bonus")] public int? SavingThrowBonus { get; set; }
}

