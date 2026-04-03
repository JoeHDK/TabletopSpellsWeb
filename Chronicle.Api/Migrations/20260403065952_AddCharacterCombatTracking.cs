using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterCombatTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActiveConditionsJson",
                table: "Characters",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ConcentrationSpell",
                table: "Characters",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeathSaveFailures",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DeathSaveSuccesses",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ExhaustionLevel",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SkillExpertiseJson",
                table: "Characters",
                type: "jsonb",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActiveConditionsJson",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "ConcentrationSpell",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "DeathSaveFailures",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "DeathSaveSuccesses",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "ExhaustionLevel",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "SkillExpertiseJson",
                table: "Characters");
        }
    }
}
