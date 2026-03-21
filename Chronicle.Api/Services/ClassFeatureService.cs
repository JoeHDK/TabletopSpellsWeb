using System.Text.Json;
using Chronicle.Api.Models;

namespace Chronicle.Api.Services;

public class ClassFeatureService
{
    private List<ClassFeature>? _cache;
    private readonly object _lock = new();
    private readonly string _filePath;

    public ClassFeatureService(IWebHostEnvironment env)
    {
        _filePath = Path.Combine(env.ContentRootPath, "ClassFeatures", "dnd5e-class-features.json");
    }

    private List<ClassFeature> Load()
    {
        if (_cache != null) return _cache;
        lock (_lock)
        {
            if (_cache != null) return _cache;
            var json = File.ReadAllText(_filePath);
            _cache = JsonSerializer.Deserialize<List<ClassFeature>>(json) ?? new();
            return _cache;
        }
    }

    public List<ClassFeature> GetAll() => Load();

    public List<ClassFeature> GetForCharacter(string className, int level, string? subclass = null)
    {
        var normalClass = className.ToLowerInvariant();
        var normalSubclass = subclass?.ToLowerInvariant();

        return Load()
            .Where(f =>
                f.Class == normalClass &&
                f.MinLevel <= level &&
                (f.Subclass == null || f.Subclass == normalSubclass))
            .ToList();
    }

    public ClassFeature? GetByIndex(string index) =>
        Load().FirstOrDefault(f => f.Index.Equals(index, StringComparison.OrdinalIgnoreCase));
}
