using System.Text.Json;
using Chronicle.Api.DTOs;
using Chronicle.Api.Models.Enums;

namespace Chronicle.Api.Services;

/// <summary>
/// Computes the expected class resource pools for a character based on their class, level,
/// and ability scores. Returns a list of upsert requests — callers should apply these to
/// ensure the character always has up-to-date resources.
/// </summary>
public class ClassResourceSeedService
{
    public List<UpsertClassResourceRequest> GetExpectedResources(
        Class characterClass,
        int level,
        Subclass? subclass,
        Dictionary<string, int> abilityScores)
    {
        int chaMod = GetMod(abilityScores, "Charisma");
        int wisMod = GetMod(abilityScores, "Wisdom");

        return characterClass switch
        {
            Class.Cleric => GetClericResources(level),
            Class.Paladin => GetPaladinResources(level, chaMod),
            Class.Monk => GetMonkResources(level),
            Class.Barbarian => GetBarbarianResources(level),
            Class.Sorcerer => GetSorcererResources(level),
            Class.Fighter => GetFighterResources(level, subclass),
            Class.Warlock => GetWarlockResources(level),
            Class.Bard => GetBardResources(level, chaMod),
            Class.Artificer => GetArtificerResources(level, wisMod),
            _ => new List<UpsertClassResourceRequest>(),
        };
    }

    // ── Cleric ────────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetClericResources(int level)
    {
        var resources = new List<UpsertClassResourceRequest>();

        if (level >= 2)
        {
            int channelUses = level >= 18 ? 3 : level >= 6 ? 2 : 1;
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "channel_divinity",
                Name = "Channel Divinity",
                MaxUses = channelUses,
                ResetOn = "short_rest",
            });
        }

        if (level >= 10)
        {
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "divine_intervention",
                Name = "Divine Intervention",
                MaxUses = 1,
                ResetOn = "weekly",
            });
        }

        return resources;
    }

    // ── Paladin ───────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetPaladinResources(int level, int chaMod)
    {
        var resources = new List<UpsertClassResourceRequest>
        {
            new()
            {
                ResourceKey = "divine_sense",
                Name = "Divine Sense",
                MaxUses = Math.Max(1, 1 + chaMod),
                ResetOn = "long_rest",
            },
            new()
            {
                ResourceKey = "lay_on_hands",
                Name = "Lay on Hands",
                MaxUses = level * 5,
                ResetOn = "long_rest",
                IsHpPool = true,
            },
        };

        if (level >= 3)
        {
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "channel_divinity",
                Name = "Channel Divinity",
                MaxUses = 1,
                ResetOn = "long_rest",
            });
        }

        if (level >= 14)
        {
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "cleansing_touch",
                Name = "Cleansing Touch",
                MaxUses = Math.Max(1, chaMod),
                ResetOn = "long_rest",
            });
        }

        return resources;
    }

    // ── Monk ──────────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetMonkResources(int level)
    {
        if (level < 2) return new();

        return new List<UpsertClassResourceRequest>
        {
            new()
            {
                ResourceKey = "ki_points",
                Name = "Ki Points",
                MaxUses = level,
                ResetOn = "short_rest",
            },
        };
    }

    // ── Barbarian ─────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetBarbarianResources(int level)
    {
        int rageUses = level switch
        {
            >= 20 => 99, // Unlimited
            >= 17 => 6,
            >= 15 => 5,
            >= 12 => 4,
            >= 6 => 3,
            _ => 2,
        };

        return new List<UpsertClassResourceRequest>
        {
            new()
            {
                ResourceKey = "rage",
                Name = "Rage",
                MaxUses = rageUses,
                ResetOn = "long_rest",
            },
        };
    }

    // ── Sorcerer ──────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetSorcererResources(int level)
    {
        if (level < 2) return new();

        return new List<UpsertClassResourceRequest>
        {
            new()
            {
                ResourceKey = "sorcery_points",
                Name = "Sorcery Points",
                MaxUses = level,
                ResetOn = "long_rest",
            },
        };
    }

    // ── Fighter ───────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetFighterResources(int level, Subclass? subclass)
    {
        var resources = new List<UpsertClassResourceRequest>
        {
            new()
            {
                ResourceKey = "second_wind",
                Name = "Second Wind",
                MaxUses = 1,
                ResetOn = "short_rest",
            },
        };

        if (level >= 2)
        {
            int actionSurgeUses = level >= 17 ? 2 : 1;
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "action_surge",
                Name = "Action Surge",
                MaxUses = actionSurgeUses,
                ResetOn = "short_rest",
            });
        }

        if (level >= 9)
        {
            int indomitableUses = level >= 17 ? 3 : level >= 13 ? 2 : 1;
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "indomitable",
                Name = "Indomitable",
                MaxUses = indomitableUses,
                ResetOn = "long_rest",
            });
        }

        if (level >= 3 && subclass == Subclass.FighterArcaneArcher)
        {
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "arcane_shot",
                Name = "Arcane Shot",
                MaxUses = 2,
                ResetOn = "short_rest",
            });
        }

        return resources;
    }

    // ── Warlock ───────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetWarlockResources(int level)
    {
        // Pact Magic slots: short rest recovery, count = 1-4 based on level
        int pactSlots = level switch
        {
            >= 11 => 3,
            >= 2 => 2,
            _ => 1,
        };

        var resources = new List<UpsertClassResourceRequest>
        {
            new()
            {
                ResourceKey = "pact_magic_slots",
                Name = "Pact Magic Slots",
                MaxUses = pactSlots,
                ResetOn = "short_rest",
            },
        };

        // Mystic Arcanum — once per long rest each
        if (level >= 11) resources.Add(new UpsertClassResourceRequest { ResourceKey = "mystic_arcanum_6", Name = "Mystic Arcanum (6th)", MaxUses = 1, ResetOn = "long_rest" });
        if (level >= 13) resources.Add(new UpsertClassResourceRequest { ResourceKey = "mystic_arcanum_7", Name = "Mystic Arcanum (7th)", MaxUses = 1, ResetOn = "long_rest" });
        if (level >= 15) resources.Add(new UpsertClassResourceRequest { ResourceKey = "mystic_arcanum_8", Name = "Mystic Arcanum (8th)", MaxUses = 1, ResetOn = "long_rest" });
        if (level >= 17) resources.Add(new UpsertClassResourceRequest { ResourceKey = "mystic_arcanum_9", Name = "Mystic Arcanum (9th)", MaxUses = 1, ResetOn = "long_rest" });

        return resources;
    }

    // ── Bard ──────────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetBardResources(int level, int chaMod)
    {
        // Before level 5, Bardic Inspiration recharges on long rest
        // At level 5+ (Font of Inspiration), it recharges on short rest
        string resetOn = level >= 5 ? "short_rest" : "long_rest";

        return new List<UpsertClassResourceRequest>
        {
            new()
            {
                ResourceKey = "bardic_inspiration",
                Name = "Bardic Inspiration",
                MaxUses = Math.Max(1, chaMod),
                ResetOn = resetOn,
            },
        };
    }

    // ── Artificer ─────────────────────────────────────────────────────────────

    private static List<UpsertClassResourceRequest> GetArtificerResources(int level, int intMod)
    {
        var resources = new List<UpsertClassResourceRequest>();

        if (level >= 2)
        {
            // Infused Items: can infuse level/2 items, but tracked as daily uses
            int infuseCount = level / 2;
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "infusions",
                Name = "Infusions",
                MaxUses = infuseCount,
                ResetOn = "long_rest",
            });
        }

        if (level >= 5)
        {
            resources.Add(new UpsertClassResourceRequest
            {
                ResourceKey = "arcane_firearm",
                Name = "Arcane Firearm",
                MaxUses = 1,
                ResetOn = "long_rest",
            });
        }

        return resources;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static int GetMod(Dictionary<string, int> scores, string ability)
    {
        if (scores.TryGetValue(ability, out int score))
            return (score - 10) / 2;
        return 0;
    }
}
