using Newtonsoft.Json;
using TabletopSpells.Api.Models;

namespace TabletopSpells.Api.Services;

public class ItemService
{
    private static List<Item>? _cache;
    private static readonly object _lock = new();

    public List<Item> GetItems()
    {
        lock (_lock)
        {
            if (_cache is not null) return _cache;

            var filePath = Path.Combine(AppContext.BaseDirectory, "Items", "dnd5e-items.json");
            var json = File.ReadAllText(filePath);
            _cache = JsonConvert.DeserializeObject<List<Item>>(json) ?? [];
            return _cache;
        }
    }

    public List<Item> Search(string? search, string? category, string? rarity, string? itemType)
    {
        var items = GetItems().AsEnumerable();

        if (!string.IsNullOrWhiteSpace(search))
            items = items.Where(i => i.Name?.Contains(search, StringComparison.OrdinalIgnoreCase) == true);

        if (!string.IsNullOrWhiteSpace(category))
            items = items.Where(i => i.Category?.Equals(category, StringComparison.OrdinalIgnoreCase) == true);

        if (!string.IsNullOrWhiteSpace(rarity))
            items = items.Where(i => i.Rarity?.Equals(rarity, StringComparison.OrdinalIgnoreCase) == true);

        if (!string.IsNullOrWhiteSpace(itemType))
            items = items.Where(i => i.ItemType?.Equals(itemType, StringComparison.OrdinalIgnoreCase) == true);

        return items.OrderBy(i => i.Name).ToList();
    }

    public List<string> GetCategories() =>
        GetItems().Select(i => i.Category).Where(c => !string.IsNullOrEmpty(c)).Distinct().Order().Cast<string>().ToList();
}
