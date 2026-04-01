using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWildShapeToCharacter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WildShapeBeastCurrentHp",
                table: "Characters",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WildShapeBeastMaxHp",
                table: "Characters",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WildShapeBeastName",
                table: "Characters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WildShapeUsesRemaining",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WildShapeBeastCurrentHp",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "WildShapeBeastMaxHp",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "WildShapeBeastName",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "WildShapeUsesRemaining",
                table: "Characters");
        }
    }
}
