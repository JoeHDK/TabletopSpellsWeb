using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHpAcInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BaseArmorClass",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CurrentHp",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxHp",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "InventoryItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemSource = table.Column<int>(type: "integer", nullable: false),
                    SrdItemIndex = table.Column<string>(type: "text", nullable: true),
                    CustomItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    IsEquipped = table.Column<bool>(type: "boolean", nullable: false),
                    EquippedSlot = table.Column<int>(type: "integer", nullable: true),
                    AcBonus = table.Column<int>(type: "integer", nullable: true),
                    DamageOverride = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    GrantedByUserId = table.Column<string>(type: "text", nullable: true),
                    AcquiredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryItems_AspNetUsers_GrantedByUserId",
                        column: x => x.GrantedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Characters_CharacterId",
                        column: x => x.CharacterId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InventoryItems_CustomItems_CustomItemId",
                        column: x => x.CustomItemId,
                        principalTable: "CustomItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_CharacterId",
                table: "InventoryItems",
                column: "CharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_CustomItemId",
                table: "InventoryItems",
                column: "CustomItemId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_GrantedByUserId",
                table: "InventoryItems",
                column: "GrantedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "BaseArmorClass",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "CurrentHp",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "MaxHp",
                table: "Characters");
        }
    }
}
