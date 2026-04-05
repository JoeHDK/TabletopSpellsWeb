using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Helpers;

public static class ClassHelper
{
    public static readonly Class[] AllClasses =
    [
        Class.Barbarian, Class.Bard, Class.Cleric, Class.Druid, Class.Fighter,
        Class.Monk, Class.Paladin, Class.Ranger, Class.Rogue, Class.Sorcerer,
        Class.Wizard, Class.Warlock, Class.Artificer,
    ];

    public static readonly Class[] DivineCasters =
    [
        Class.Cleric, Class.Druid, Class.Paladin,
    ];

    public static IEnumerable<Class> GetClassesByGame(Game game) => AllClasses;

    public static bool IsDivineCaster(Class characterClass) =>
        DivineCasters.Contains(characterClass);
}
