using System.Text.Json;
using Chronicle.Api.DTOs;

namespace Chronicle.Api.Services;

public class BeastService
{
    private static List<BeastDto>? _cache;
    private static readonly object _lock = new();

    public List<BeastDto> GetBeasts(double? maxCr = null, bool allowFly = true, bool allowSwim = true)
    {
        var all = LoadAll();
        return all
            .Where(b => maxCr == null || b.Cr <= maxCr)
            .Where(b => allowFly || b.FlySpeed == 0)
            .Where(b => allowSwim || b.SwimSpeed == 0)
            .OrderBy(b => b.Cr)
            .ThenBy(b => b.Name)
            .ToList();
    }

    private static List<BeastDto> LoadAll()
    {
        if (_cache != null) return _cache;
        lock (_lock)
        {
            if (_cache != null) return _cache;
            var path = Path.Combine(AppContext.BaseDirectory, "WildShape", "srd-beasts.json");
            var json = File.ReadAllText(path);
            _cache = JsonSerializer.Deserialize<List<BeastDto>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            }) ?? [];
            return _cache;
        }
    }
}
