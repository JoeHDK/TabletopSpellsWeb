using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentAbilityUsagesAndCustomItemAbilities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AbilitiesJson",
                table: "CustomItems",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EquipmentAbilityUsages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InventoryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    AbilityName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SpellIndex = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MaxUses = table.Column<int>(type: "integer", nullable: false),
                    UsesRemaining = table.Column<int>(type: "integer", nullable: false),
                    ResetOn = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentAbilityUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentAbilityUsages_InventoryItems_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "InventoryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentAbilityUsages_InventoryItemId",
                table: "EquipmentAbilityUsages",
                column: "InventoryItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EquipmentAbilityUsages");

            migrationBuilder.DropColumn(
                name: "AbilitiesJson",
                table: "CustomItems");
        }
    }
}
