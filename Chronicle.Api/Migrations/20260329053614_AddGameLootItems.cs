using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGameLootItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameLootItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameRoomId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ItemSource = table.Column<int>(type: "integer", nullable: false),
                    SrdItemIndex = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CustomItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    AcBonus = table.Column<int>(type: "integer", nullable: true),
                    ArmorType = table.Column<int>(type: "integer", nullable: true),
                    DamageOverride = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameLootItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameLootItems_CustomItems_CustomItemId",
                        column: x => x.CustomItemId,
                        principalTable: "CustomItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_GameLootItems_GameRooms_GameRoomId",
                        column: x => x.GameRoomId,
                        principalTable: "GameRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameLootItems_CustomItemId",
                table: "GameLootItems",
                column: "CustomItemId");

            migrationBuilder.CreateIndex(
                name: "IX_GameLootItems_GameRoomId",
                table: "GameLootItems",
                column: "GameRoomId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameLootItems");
        }
    }
}
