using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TabletopSpells.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIsNpcToCharacter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsNpc",
                table: "Characters",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsNpc",
                table: "Characters");
        }
    }
}
