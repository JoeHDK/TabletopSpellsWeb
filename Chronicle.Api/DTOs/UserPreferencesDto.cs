namespace Chronicle.Api.DTOs;

public class UserPreferencesDto
{
    public List<string> OverviewCardOrder { get; set; } = new();
}

public class UpdateUserPreferencesRequest
{
    public List<string>? OverviewCardOrder { get; set; }
}
