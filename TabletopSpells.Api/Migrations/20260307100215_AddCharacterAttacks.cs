using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TabletopSpells.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterAttacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CharacterAttacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    DamageFormula = table.Column<string>(type: "text", nullable: true),
                    DamageType = table.Column<string>(type: "text", nullable: true),
                    AbilityMod = table.Column<string>(type: "text", nullable: false),
                    UseProficiency = table.Column<bool>(type: "boolean", nullable: false),
                    MagicBonus = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterAttacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CharacterAttacks_Characters_CharacterId",
                        column: x => x.CharacterId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CharacterAttacks_CharacterId",
                table: "CharacterAttacks",
                column: "CharacterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CharacterAttacks");
        }
    }
}
