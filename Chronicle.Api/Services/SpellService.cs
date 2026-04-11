using Newtonsoft.Json;
using Chronicle.Api.Models;
using Chronicle.Api.Models.Enums;
using System.Text;

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

            if (game == Game.custom)
            {
                _cache[game] = [];
                return [];
            }

            var filePath = Path.Combine(AppContext.BaseDirectory, "Spells", "dnd5e.json");
            var json = File.ReadAllText(filePath);
            var settings = new JsonSerializerSettings
            {
                Error = (_, args) => args.ErrorContext.Handled = true,
            };
            var spells = JsonConvert.DeserializeObject<List<Spell>>(json, settings) ?? new List<Spell>();
            foreach (var spell in spells)
            {
                spell.Id = GetStableSpellId(spell.Name);
            }
            _cache[game] = spells;
            return spells;
        }
    }

    public static string GetStableSpellId(string? spellName)
    {
        if (string.IsNullOrWhiteSpace(spellName)) return "";

        var normalized = spellName.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        var previousWasHyphen = false;

        foreach (var ch in normalized)
        {
            var category = char.GetUnicodeCategory(ch);
            if (category == System.Globalization.UnicodeCategory.NonSpacingMark) continue;

            if (char.IsLetterOrDigit(ch))
            {
                builder.Append(ch);
                previousWasHyphen = false;
                continue;
            }

            if (ch == '\'' || ch == '’') continue;

            if (!previousWasHyphen)
            {
                builder.Append('-');
                previousWasHyphen = true;
            }
        }

        return builder.ToString().Trim('-');
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
