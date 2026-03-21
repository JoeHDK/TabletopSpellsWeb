using Newtonsoft.Json;
using Chronicle.Api.DTOs;
using Chronicle.Api.Models;

namespace Chronicle.Api.Services;

public class MonsterService
{
    private static List<Monster>? _cache;
    private static readonly object _lock = new();

    private List<Monster> LoadAll()
    {
        if (_cache != null) return _cache;
        lock (_lock)
        {
            if (_cache != null) return _cache;
            var path = Path.Combine(AppContext.BaseDirectory, "Monsters", "dnd5e-monsters.json");
            var json = File.ReadAllText(path);
            var settings = new JsonSerializerSettings
            {
                Error = (_, args) => args.ErrorContext.Handled = true,
            };
            _cache = JsonConvert.DeserializeObject<List<Monster>>(json, settings) ?? new List<Monster>();
            return _cache;
        }
    }

    public List<MonsterSummaryDto> GetMonsters(string? search = null, string? type = null, double? minCr = null, double? maxCr = null)
    {
        return LoadAll()
            .Where(m => string.IsNullOrWhiteSpace(search) || m.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
            .Where(m => string.IsNullOrWhiteSpace(type) || m.Type.Equals(type, StringComparison.OrdinalIgnoreCase))
            .Where(m => minCr == null || m.Cr >= minCr)
            .Where(m => maxCr == null || m.Cr <= maxCr)
            .OrderBy(m => m.Cr)
            .ThenBy(m => m.Name)
            .Select(ToSummary)
            .ToList();
    }

    public MonsterDto? GetMonster(string name)
    {
        var monster = LoadAll().FirstOrDefault(m => m.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
        return monster == null ? null : ToDto(monster);
    }

    public List<string> GetTypes()
    {
        return LoadAll()
            .Select(m => m.Type)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(t => t)
            .ToList();
    }

    private static MonsterSummaryDto ToSummary(Monster m) => new()
    {
        Name = m.Name,
        Type = m.Type,
        Subtype = m.Subtype,
        Cr = m.Cr,
        Size = m.Size,
        Ac = m.Ac,
        Hp = m.Hp,
        Source = m.Source,
    };

    private static MonsterDto ToDto(Monster m) => new()
    {
        Name = m.Name,
        Type = m.Type,
        Subtype = m.Subtype,
        Cr = m.Cr,
        Size = m.Size,
        Ac = m.Ac,
        AcNote = m.AcNote,
        Hp = m.Hp,
        HitDice = m.HitDice,
        Source = m.Source,
        Str = m.Str,
        Dex = m.Dex,
        Con = m.Con,
        Int = m.Int,
        Wis = m.Wis,
        Cha = m.Cha,
        WalkSpeed = m.WalkSpeed,
        FlySpeed = m.FlySpeed,
        SwimSpeed = m.SwimSpeed,
        ClimbSpeed = m.ClimbSpeed,
        BurrowSpeed = m.BurrowSpeed,
        SavingThrows = m.SavingThrows,
        Skills = m.Skills,
        DamageImmunities = m.DamageImmunities,
        DamageResistances = m.DamageResistances,
        DamageVulnerabilities = m.DamageVulnerabilities,
        ConditionImmunities = m.ConditionImmunities,
        Senses = m.Senses,
        Languages = m.Languages,
        Traits = m.Traits.Select(t => new MonsterTraitDto { Name = t.Name, Description = t.Description }).ToList(),
        Actions = m.Actions.Select(a => new MonsterActionDto { Name = a.Name, Description = a.Description }).ToList(),
        LegendaryActions = m.LegendaryActions.Select(a => new MonsterActionDto { Name = a.Name, Description = a.Description }).ToList(),
    };
}
