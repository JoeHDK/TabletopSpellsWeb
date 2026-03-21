using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Chronicle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GameRoomId",
                table: "Characters",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAdmin",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "GameRooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    DmUserId = table.Column<string>(type: "text", nullable: false),
                    InviteCode = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameRooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameRooms_AspNetUsers_DmUserId",
                        column: x => x.DmUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GameMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GameRoomId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameMembers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GameMembers_GameRooms_GameRoomId",
                        column: x => x.GameRoomId,
                        principalTable: "GameRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Characters_GameRoomId",
                table: "Characters",
                column: "GameRoomId");

            migrationBuilder.CreateIndex(
                name: "IX_GameMembers_GameRoomId_UserId",
                table: "GameMembers",
                columns: new[] { "GameRoomId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GameMembers_UserId",
                table: "GameMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GameRooms_DmUserId",
                table: "GameRooms",
                column: "DmUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GameRooms_InviteCode",
                table: "GameRooms",
                column: "InviteCode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Characters_GameRooms_GameRoomId",
                table: "Characters",
                column: "GameRoomId",
                principalTable: "GameRooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Characters_GameRooms_GameRoomId",
                table: "Characters");

            migrationBuilder.DropTable(
                name: "GameMembers");

            migrationBuilder.DropTable(
                name: "GameRooms");

            migrationBuilder.DropIndex(
                name: "IX_Characters_GameRoomId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "GameRoomId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "IsAdmin",
                table: "AspNetUsers");
        }
    }
}
