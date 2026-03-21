using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Helpers;

public static class ClassHelper
{
    private static readonly Dictionary<Class, List<Game>> ClassGameMapping = new()
    {
        { Class.Barbarian, [Game.pathfinder1e, Game.dnd5e] },
        { Class.Bard,      [Game.pathfinder1e, Game.dnd5e] },
        { Class.Cleric,    [Game.pathfinder1e, Game.dnd5e] },
        { Class.Druid,     [Game.pathfinder1e, Game.dnd5e] },
        { Class.Fighter,   [Game.pathfinder1e, Game.dnd5e] },
        { Class.Monk,      [Game.pathfinder1e, Game.dnd5e] },
        { Class.Paladin,   [Game.pathfinder1e, Game.dnd5e] },
        { Class.Ranger,    [Game.pathfinder1e, Game.dnd5e] },
        { Class.Rogue,     [Game.pathfinder1e, Game.dnd5e] },
        { Class.Sorcerer,  [Game.pathfinder1e, Game.dnd5e] },
        { Class.Wizard,    [Game.pathfinder1e, Game.dnd5e] },
        { Class.Warlock,   [Game.pathfinder1e, Game.dnd5e] },
        { Class.Artificer, [Game.pathfinder1e, Game.dnd5e] },
        { Class.Inquisitor,   [Game.pathfinder1e] },
        { Class.Summoner,     [Game.pathfinder1e] },
        { Class.Witch,        [Game.pathfinder1e] },
        { Class.Alchemist,    [Game.pathfinder1e] },
        { Class.Magus,        [Game.pathfinder1e] },
        { Class.Oracle,       [Game.pathfinder1e] },
        { Class.Shaman,       [Game.pathfinder1e] },
        { Class.Spiritualist, [Game.pathfinder1e] },
        { Class.Occultist,    [Game.pathfinder1e] },
        { Class.Psychic,      [Game.pathfinder1e] },
        { Class.Mesmerist,    [Game.pathfinder1e] },
    };

    public static readonly Class[] DivineCasters =
    {
        Class.Cleric, Class.Druid, Class.Paladin,
        Class.Oracle, Class.Shaman, Class.Inquisitor
    };

    public static IEnumerable<Class> GetClassesByGame(Game game) =>
        ClassGameMapping.Where(kvp => kvp.Value.Contains(game)).Select(kvp => kvp.Key);

    public static bool IsDivineCaster(Class characterClass) =>
        DivineCasters.Contains(characterClass);
}
