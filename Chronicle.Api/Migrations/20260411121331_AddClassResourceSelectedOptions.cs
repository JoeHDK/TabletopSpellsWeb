using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClassResourceSelectedOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SelectedOptionsJson",
                table: "ClassResources",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SelectedOptionsJson",
                table: "ClassResources");
        }
    }
}
