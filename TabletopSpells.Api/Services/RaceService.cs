using System.Text.Json;
using TabletopSpells.Api.Models;

namespace TabletopSpells.Api.Services;

public class RaceService
{
    private List<Race>? _cache;
    private readonly object _lock = new();
    private readonly string _filePath;

    public RaceService(IWebHostEnvironment env)
    {
        _filePath = Path.Combine(env.ContentRootPath, "Races", "dnd5e-races.json");
    }

    private List<Race> Load()
    {
        if (_cache != null) return _cache;
        lock (_lock)
        {
            if (_cache != null) return _cache;
            var json = File.ReadAllText(_filePath);
            _cache = JsonSerializer.Deserialize<List<Race>>(json) ?? new();
            return _cache;
        }
    }

    public List<Race> GetAll() => Load();

    public Race? GetByIndex(string index) =>
        Load().FirstOrDefault(r => r.Index.Equals(index, StringComparison.OrdinalIgnoreCase));

    public List<Race> Search(string? search) =>
        string.IsNullOrWhiteSpace(search)
            ? Load()
            : Load().Where(r => r.Name.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
}
