using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Chronicle.Api.Data;
using Chronicle.Api.Data.Entities;
using Chronicle.Api.DTOs;
using Chronicle.Api.Services;

namespace Chronicle.Api.Controllers;

[ApiController]
[Route("api/game-rooms/{gameRoomId}/images")]
[Authorize]
public class CampaignImagesController(AppDbContext db, IWebHostEnvironment env, IGameAuthorizationService authService) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    // GET /api/game-rooms/{gameRoomId}/images
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid gameRoomId)
    {
        if (!await authService.IsMemberAsync(gameRoomId, UserId)) return Forbid();
        var isDm = await authService.IsDmAsync(gameRoomId, UserId);

        var images = await db.CampaignImages
            .Where(i => i.GameRoomId == gameRoomId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        // Players only see images published to them (or published to all)
        if (!isDm)
        {
            images = images.Where(i =>
            {
                if (!i.IsPublished) return false;
                if (i.PublishedToUserIdsJson == null) return true; // all members
                var ids = JsonSerializer.Deserialize<List<string>>(i.PublishedToUserIdsJson) ?? [];
                return ids.Contains(UserId);
            }).ToList();
        }

        return Ok(images.Select(ToDto));
    }

    // POST /api/game-rooms/{gameRoomId}/images  (multipart/form-data)
    [HttpPost]
    [RequestSizeLimit(10_500_000)]
    public async Task<IActionResult> Upload(Guid gameRoomId, IFormFile file, [FromForm] string? caption)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        if (file == null|| file.Length == 0) return BadRequest("No file provided.");
        if (file.Length > MaxFileSizeBytes) return BadRequest("File exceeds 10 MB limit.");

        // Read and validate magic bytes — ContentType is client-controlled and cannot be trusted
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();
        var detectedMime = DetectImageMime(bytes);
        if (detectedMime == null) return BadRequest("File must be a valid JPEG, PNG, GIF, or WebP image.");

        var uploadDir = Path.Combine(env.ContentRootPath, "uploads", gameRoomId.ToString());
        Directory.CreateDirectory(uploadDir);

        // Use MIME-derived extension — never trust client-supplied filename
        var ext = detectedMime switch
        {
            "image/jpeg" => ".jpg",
            "image/png"  => ".png",
            "image/gif"  => ".gif",
            "image/webp" => ".webp",
            _            => ".bin",
        };
        var storedName = $"{Guid.NewGuid()}{ext}";
        var storagePath = Path.Combine(uploadDir, storedName);

        await System.IO.File.WriteAllBytesAsync(storagePath, bytes);

        var entity = new CampaignImageEntity
        {
            GameRoomId = gameRoomId,
            UploaderUserId = UserId,
            FileName = file.FileName,
            ContentType = file.ContentType,
            StoragePath = storagePath,
            FileSizeBytes = file.Length,
            Caption = caption?.Trim(),
            IsPublished = false,
        };
        db.CampaignImages.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { gameRoomId }, ToDto(entity));
    }

    // GET /api/game-rooms/{gameRoomId}/images/{imageId}/file
    [HttpGet("{imageId:guid}/file")]
    public async Task<IActionResult> GetFile(Guid gameRoomId, Guid imageId)
    {
        if (!await authService.IsMemberAsync(gameRoomId, UserId)) return Forbid();
        var isDm = await authService.IsDmAsync(gameRoomId, UserId);

        var image = await db.CampaignImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.GameRoomId == gameRoomId);
        if (image == null) return NotFound();

        if (!isDm)
        {
            if (!image.IsPublished) return Forbid();
            if (image.PublishedToUserIdsJson != null)
            {
                var ids = JsonSerializer.Deserialize<List<string>>(image.PublishedToUserIdsJson) ?? [];
                if (!ids.Contains(UserId)) return Forbid();
            }
        }

        if (!System.IO.File.Exists(image.StoragePath)) return NotFound("File not found on disk.");

        var bytes = await System.IO.File.ReadAllBytesAsync(image.StoragePath);
        return File(bytes, image.ContentType, image.FileName);
    }

    // PATCH /api/game-rooms/{gameRoomId}/images/{imageId}
    [HttpPatch("{imageId:guid}")]
    public async Task<IActionResult> Update(Guid gameRoomId, Guid imageId, [FromBody] UpdateCampaignImageRequest req)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var image = await db.CampaignImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.GameRoomId == gameRoomId);
        if (image == null) return NotFound();

        if (req.Caption != null) image.Caption = req.Caption.Trim();
        if (req.IsPublished.HasValue) image.IsPublished = req.IsPublished.Value;
        if (req.PublishedToUserIds != null)
            image.PublishedToUserIdsJson = req.PublishedToUserIds.Count == 0
                ? null
                : JsonSerializer.Serialize(req.PublishedToUserIds);

        await db.SaveChangesAsync();
        return Ok(ToDto(image));
    }

    // DELETE /api/game-rooms/{gameRoomId}/images/{imageId}
    [HttpDelete("{imageId:guid}")]
    public async Task<IActionResult> Delete(Guid gameRoomId, Guid imageId)
    {
        if (!await authService.IsDmAsync(gameRoomId, UserId)) return Forbid();

        var image = await db.CampaignImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.GameRoomId == gameRoomId);
        if (image == null) return NotFound();

        if (System.IO.File.Exists(image.StoragePath))
            System.IO.File.Delete(image.StoragePath);

        db.CampaignImages.Remove(image);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CampaignImageDto ToDto(CampaignImageEntity i) => new()
    {
        Id = i.Id,
        GameRoomId = i.GameRoomId,
        UploaderUserId = i.UploaderUserId,
        FileName = i.FileName,
        ContentType = i.ContentType,
        FileSizeBytes = i.FileSizeBytes,
        Caption = i.Caption,
        IsPublished = i.IsPublished,
        PublishedToUserIds = i.PublishedToUserIdsJson == null
            ? null
            : JsonSerializer.Deserialize<List<string>>(i.PublishedToUserIdsJson),
        CreatedAt = i.CreatedAt,
    };

    private static string? DetectImageMime(byte[] bytes)
    {
        if (bytes.Length < 4) return null;
        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return "image/jpeg";
        if (bytes.Length >= 8 &&
            bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
            bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) return "image/png";
        if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46) return "image/gif";
        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) return "image/webp";
        return null;
    }
}
