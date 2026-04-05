using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomFeat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "FeatIndex",
                table: "CharacterFeats",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "CustomDescription",
                table: "CharacterFeats",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomName",
                table: "CharacterFeats",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCustom",
                table: "CharacterFeats",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomDescription",
                table: "CharacterFeats");

            migrationBuilder.DropColumn(
                name: "CustomName",
                table: "CharacterFeats");

            migrationBuilder.DropColumn(
                name: "IsCustom",
                table: "CharacterFeats");

            migrationBuilder.AlterColumn<string>(
                name: "FeatIndex",
                table: "CharacterFeats",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
