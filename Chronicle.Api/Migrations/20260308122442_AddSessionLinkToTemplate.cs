using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionLinkToTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SessionNoteId",
                table: "EncounterTemplates",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncounterTemplates_SessionNoteId",
                table: "EncounterTemplates",
                column: "SessionNoteId");

            migrationBuilder.AddForeignKey(
                name: "FK_EncounterTemplates_SessionNotes_SessionNoteId",
                table: "EncounterTemplates",
                column: "SessionNoteId",
                principalTable: "SessionNotes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EncounterTemplates_SessionNotes_SessionNoteId",
                table: "EncounterTemplates");

            migrationBuilder.DropIndex(
                name: "IX_EncounterTemplates_SessionNoteId",
                table: "EncounterTemplates");

            migrationBuilder.DropColumn(
                name: "SessionNoteId",
                table: "EncounterTemplates");
        }
    }
}
