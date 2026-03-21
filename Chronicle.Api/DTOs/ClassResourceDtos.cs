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
    public string ResourceKey { get; set; } = "";
    public string Name { get; set; } = "";
    public int MaxUses { get; set; }
    public string ResetOn { get; set; } = "long_rest";
    public bool IsHpPool { get; set; }
}

public class UseClassResourceRequest
{
    /// <summary>Amount to consume. Defaults to 1.</summary>
    public int Amount { get; set; } = 1;
}
