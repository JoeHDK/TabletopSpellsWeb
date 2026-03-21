namespace Chronicle.Api.Models;

public class SpellCastLog
{
    public DateTime CastTime { get; set; }
    public string? SpellName { get; set; }
    public int SpellLevel { get; set; }
    public int SessionId { get; set; }
    public string? FailedReason { get; set; }
    public bool CastAsRitual { get; set; }
    public string? CharacterName { get; set; }
    public bool Success { get; set; }
    public string? Reason { get; set; }
}
