using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TabletopSpells.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClassResources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClassResources",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResourceKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MaxUses = table.Column<int>(type: "integer", nullable: false),
                    UsesRemaining = table.Column<int>(type: "integer", nullable: false),
                    ResetOn = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsHpPool = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassResources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassResources_Characters_CharacterId",
                        column: x => x.CharacterId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassResources_CharacterId_ResourceKey",
                table: "ClassResources",
                columns: new[] { "CharacterId", "ResourceKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassResources");
        }
    }
}
