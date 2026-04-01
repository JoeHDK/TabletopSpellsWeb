using System.Text.Json;
using Chronicle.Api.Models;

namespace Chronicle.Api.Services;

public class BackgroundService
{
    private List<Background>? _cache;
    private readonly object _lock = new();
    private readonly string _filePath;

    public BackgroundService(IWebHostEnvironment env)
    {
        _filePath = Path.Combine(env.ContentRootPath, "Backgrounds", "dnd5e-backgrounds.json");
    }

    private List<Background> Load()
    {
        if (_cache != null) return _cache;
        lock (_lock)
        {
            if (_cache != null) return _cache;
            var json = File.ReadAllText(_filePath);
            _cache = JsonSerializer.Deserialize<List<Background>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
            return _cache;
        }
    }

    public List<Background> GetAll() => Load();

    public Background? GetByIndex(string index) =>
        Load().FirstOrDefault(b => b.Index.Equals(index, StringComparison.OrdinalIgnoreCase));
}
