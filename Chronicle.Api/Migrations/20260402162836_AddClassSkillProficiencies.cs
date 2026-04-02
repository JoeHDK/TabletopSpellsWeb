using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClassSkillProficiencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClassSkillProficienciesJson",
                table: "Characters",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClassSkillProficienciesJson",
                table: "Characters");
        }
    }
}
