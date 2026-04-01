using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEncounterTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Encounters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameRoomId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    RoundNumber = table.Column<int>(type: "integer", nullable: false),
                    ActiveCreatureIndex = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Encounters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Encounters_GameRooms_GameRoomId",
                        column: x => x.GameRoomId,
                        principalTable: "GameRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EncounterCreatures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EncounterId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MonsterName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    MaxHp = table.Column<int>(type: "integer", nullable: false),
                    CurrentHp = table.Column<int>(type: "integer", nullable: false),
                    ArmorClass = table.Column<int>(type: "integer", nullable: false),
                    Initiative = table.Column<int>(type: "integer", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsPlayerCharacter = table.Column<bool>(type: "boolean", nullable: false),
                    CharacterId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncounterCreatures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EncounterCreatures_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EncounterCreatures_EncounterId",
                table: "EncounterCreatures",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_GameRoomId",
                table: "Encounters",
                column: "GameRoomId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EncounterCreatures");

            migrationBuilder.DropTable(
                name: "Encounters");
        }
    }
}
