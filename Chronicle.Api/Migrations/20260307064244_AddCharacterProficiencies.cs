using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterProficiencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SavingThrowProficienciesJson",
                table: "Characters",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "SkillProficienciesJson",
                table: "Characters",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            // Fix any rows that got an empty/null/object value from a previous bad migration run
            migrationBuilder.Sql(@"
                UPDATE ""Characters""
                SET ""SavingThrowProficienciesJson"" = '[]',
                    ""SkillProficienciesJson"" = '[]'
                WHERE ""SavingThrowProficienciesJson"" IS NULL
                   OR ""SavingThrowProficienciesJson"" = ''
                   OR ""SavingThrowProficienciesJson"" = '{}';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SavingThrowProficienciesJson",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "SkillProficienciesJson",
                table: "Characters");
        }
    }
}
