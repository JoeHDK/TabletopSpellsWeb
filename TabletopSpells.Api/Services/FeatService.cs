using Newtonsoft.Json;
using TabletopSpells.Api.Models;

namespace TabletopSpells.Api.Services;

public class FeatService
{
    private static List<Feat>? _cache;
    private static readonly object _lock = new();

    public List<Feat> GetFeats()
    {
        lock (_lock)
        {
            if (_cache is not null) return _cache;
            var filePath = Path.Combine(AppContext.BaseDirectory, "Feats", "dnd5e-feats.json");
            var json = File.ReadAllText(filePath);
            _cache = JsonConvert.DeserializeObject<List<Feat>>(json) ?? [];
            return _cache;
        }
    }

    public Feat? GetFeat(string index) =>
        GetFeats().FirstOrDefault(f => f.Index.Equals(index, StringComparison.OrdinalIgnoreCase));

    public List<Feat> Search(string? search) =>
        string.IsNullOrWhiteSpace(search)
            ? GetFeats()
            : GetFeats().Where(f => f.Name.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
}
