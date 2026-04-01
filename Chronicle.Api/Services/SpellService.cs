using Newtonsoft.Json;
using Chronicle.Api.Models;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Services;

public class SpellService
{
    private static readonly Dictionary<Game, List<Spell>> _cache = new();
    private static readonly object _lock = new();

    public List<Spell> GetSpells(Game game)
    {
        lock (_lock)
        {
            if (_cache.TryGetValue(game, out var cached)) return cached;

            var fileName = game switch
            {
                Game.dnd5e => "dnd5e.json",
                Game.pathfinder1e => "Pathfinder1e.json",
                _ => throw new ArgumentOutOfRangeException(nameof(game))
            };

            var filePath = Path.Combine(AppContext.BaseDirectory, "Spells", fileName);
            var json = File.ReadAllText(filePath);
            var settings = new JsonSerializerSettings
            {
                Error = (_, args) => args.ErrorContext.Handled = true,
            };
            var spells = JsonConvert.DeserializeObject<List<Spell>>(json, settings) ?? new List<Spell>();
            _cache[game] = spells;
            return spells;
        }
    }

    public List<Spell> GetSpellsByLevel(Game game, int level) =>
        GetSpells(game).Where(s => ParseLevel(s.SpellLevel) == level).ToList();

    public List<Spell> SearchSpells(Game game, string query) =>
        GetSpells(game)
            .Where(s => s.Name?.Contains(query, StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

    private static int ParseLevel(string? levelStr)
    {
        if (string.IsNullOrWhiteSpace(levelStr)) return 0;
        if (levelStr.Contains("cantrip", StringComparison.OrdinalIgnoreCase)) return 0;
        var digits = new string(levelStr.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var n) ? n : 0;
    }
}
