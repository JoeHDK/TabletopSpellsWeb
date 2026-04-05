using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemovePathfinder1e : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Old enum: pathfinder1e=0, dnd5e=1
            // New enum: dnd5e=0, custom=1
            // Convert all rows: old 1 (dnd5e) → new 0 (dnd5e); old 0 (pathfinder1e) → new 0 (dnd5e)
            migrationBuilder.Sql(@"UPDATE ""Characters"" SET ""GameType"" = 0;");

            // Same for CharacterClass — remove PF1E-only class values by mapping them to Barbarian (0)
            // Old PF1E-only values: Inquisitor=11, Summoner=12, Witch=13, Alchemist=14, Magus=15,
            //   Oracle=16, Shaman=17, Spiritualist=18, Occultist=19, Psychic=20, Mesmerist=21
            // Warlock was 22, Artificer was 23; new: Warlock=11, Artificer=12
            // Map PF1E-only → Barbarian (0); remap Warlock 22→11, Artificer 23→12
            migrationBuilder.Sql(@"
                UPDATE ""Characters"" SET ""CharacterClass"" = 0  WHERE ""CharacterClass"" IN (11,12,13,14,15,16,17,18,19,20,21);
                UPDATE ""Characters"" SET ""CharacterClass"" = 11 WHERE ""CharacterClass"" = 22;
                UPDATE ""Characters"" SET ""CharacterClass"" = 12 WHERE ""CharacterClass"" = 23;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally not reversible — PF1E data cannot be recovered from this migration
        }
    }
}
