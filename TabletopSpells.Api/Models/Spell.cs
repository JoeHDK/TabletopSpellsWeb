using Newtonsoft.Json;
using TabletopSpells.Api.Models.Enums;

namespace TabletopSpells.Api.Models;

public class Spell
{
    [JsonProperty("name")] public string? Name { get; set; }
    [JsonProperty("spell_level")] public string? SpellLevel { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public School? School { get; set; }
    [JsonProperty("description")] public string? Description { get; set; }
    [JsonProperty("duration")] public string? Duration { get; set; }
    [JsonProperty("components")] public string? Components { get; set; }
    [JsonProperty("saving_throw")] public string? SavingThrow { get; set; }
    [JsonProperty("range")] public string? Range { get; set; }
    [JsonProperty("source")] public string? Source { get; set; }
    [JsonProperty("targets")] public string? Targets { get; set; }
    [JsonProperty("casting_time")] public string? CastingTime { get; set; }
    [JsonProperty("ritual")] public bool Ritual { get; set; }
    public bool IsNativeSpell { get; set; }
    public bool IsAlwaysPrepared { get; set; }
    public bool IsPrepared { get; set; }
    public bool IsDomainSpell { get; set; }
    public bool IsFavoriteSpell { get; set; }
}
