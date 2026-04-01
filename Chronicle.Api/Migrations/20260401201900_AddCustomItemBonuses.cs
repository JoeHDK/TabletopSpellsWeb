using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomItemBonuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AcBonus",
                table: "CustomItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ChaBonus",
                table: "CustomItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ConBonus",
                table: "CustomItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DexBonus",
                table: "CustomItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IntBonus",
                table: "CustomItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StrBonus",
                table: "CustomItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WisBonus",
                table: "CustomItems",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcBonus",
                table: "CustomItems");

            migrationBuilder.DropColumn(
                name: "ChaBonus",
                table: "CustomItems");

            migrationBuilder.DropColumn(
                name: "ConBonus",
                table: "CustomItems");

            migrationBuilder.DropColumn(
                name: "DexBonus",
                table: "CustomItems");

            migrationBuilder.DropColumn(
                name: "IntBonus",
                table: "CustomItems");

            migrationBuilder.DropColumn(
                name: "StrBonus",
                table: "CustomItems");

            migrationBuilder.DropColumn(
                name: "WisBonus",
                table: "CustomItems");
        }
    }
}
