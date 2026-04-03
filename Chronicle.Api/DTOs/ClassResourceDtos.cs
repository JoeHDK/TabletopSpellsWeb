using System.ComponentModel.DataAnnotations;

namespace Chronicle.Api.DTOs;

public class ClassResourceDto
{
    public Guid Id { get; set; }
    public string ResourceKey { get; set; } = "";
    public string Name { get; set; } = "";
    public int MaxUses { get; set; }
    public int UsesRemaining { get; set; }
    public string ResetOn { get; set; } = "long_rest";
    public bool IsHpPool { get; set; }
}

public class UpsertClassResourceRequest
{
    [Required, MaxLength(100)] public string ResourceKey { get; set; } = "";
    [Required, MaxLength(200)] public string Name { get; set; } = "";
    [Range(0, 9999)] public int MaxUses { get; set; }
    [MaxLength(20)] public string ResetOn { get; set; } = "long_rest";
    public bool IsHpPool { get; set; }
}

public class UseClassResourceRequest
{
    /// <summary>Amount to consume. Defaults to 1.</summary>
    [Range(1, 9999)] public int Amount { get; set; } = 1;
}
