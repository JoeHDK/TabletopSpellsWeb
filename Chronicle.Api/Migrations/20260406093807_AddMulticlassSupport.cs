using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMulticlassSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastLevelUpSnapshot",
                table: "Characters",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MulticlassJson",
                table: "Characters",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastLevelUpSnapshot",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "MulticlassJson",
                table: "Characters");
        }
    }
}
