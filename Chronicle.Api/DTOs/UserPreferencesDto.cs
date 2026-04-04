namespace Chronicle.Api.DTOs;

public class UserPreferencesDto
{
    public List<string> OverviewCardOrder { get; set; } = new();
    public List<string> StatsSectionOrder { get; set; } = new();
    public List<string> StatsSectionCollapsed { get; set; } = new();
}

public class UpdateUserPreferencesRequest
{
    public List<string>? OverviewCardOrder { get; set; }
    public List<string>? StatsSectionOrder { get; set; }
    public List<string>? StatsSectionCollapsed { get; set; }
}
