using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryStatBonuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChaBonus",
                table: "InventoryItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ConBonus",
                table: "InventoryItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DamageEntriesJson",
                table: "InventoryItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DexBonus",
                table: "InventoryItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IntBonus",
                table: "InventoryItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StrBonus",
                table: "InventoryItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WisBonus",
                table: "InventoryItems",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChaBonus",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "ConBonus",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "DamageEntriesJson",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "DexBonus",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "IntBonus",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "StrBonus",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "WisBonus",
                table: "InventoryItems");
        }
    }
}
