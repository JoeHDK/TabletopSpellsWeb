using System.Security.Cryptography;
using System.Text;

namespace TabletopSpells.Api.Services;

/// <summary>
/// Server-side AES-256-GCM encryption for chat messages.
/// Each conversation has a unique 256-bit key that is stored wrapped
/// (AES-256-CBC) by a server master key from configuration.
/// Messages are encrypted with the conversation key using AES-256-GCM,
/// producing ciphertext + a random 96-bit nonce stored alongside each message.
/// </summary>
public class EncryptionService
{
    private readonly byte[] _masterKey;

    public EncryptionService(IConfiguration configuration)
    {
        var keyString = configuration["Chat:MasterKey"]
            ?? throw new InvalidOperationException(
                "Chat:MasterKey is not configured. Set the Chat__MasterKey environment variable.");
        _masterKey = DeriveKey(keyString);
    }

    // ── Conversation key management ────────────────────────────────────────────

    public string GenerateAndEncryptConversationKey()
    {
        var convKey = RandomNumberGenerator.GetBytes(32);
        return EncryptConversationKey(convKey);
    }

    public string EncryptConversationKey(byte[] convKey)
    {
        // Wrap with AES-256-CBC using a fresh IV
        using var aes = Aes.Create();
        aes.KeySize = 256;
        aes.Key = _masterKey;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var ciphertext = encryptor.TransformFinalBlock(convKey, 0, convKey.Length);

        // Store as base64(iv || ciphertext)
        var result = new byte[aes.IV.Length + ciphertext.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(ciphertext, 0, result, aes.IV.Length, ciphertext.Length);
        return Convert.ToBase64String(result);
    }

    public byte[] DecryptConversationKey(string encryptedBase64)
    {
        var data = Convert.FromBase64String(encryptedBase64);

        using var aes = Aes.Create();
        aes.KeySize = 256;
        aes.Key = _masterKey;

        var iv = data[..16];
        var ciphertext = data[16..];
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor();
        return decryptor.TransformFinalBlock(ciphertext, 0, ciphertext.Length);
    }

    // ── Message encryption ────────────────────────────────────────────────────

    public (string CiphertextBase64, string IvBase64) EncryptMessage(string plaintext, byte[] convKey)
    {
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var nonce = RandomNumberGenerator.GetBytes(12); // 96-bit GCM nonce
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[16];

        using var gcm = new AesGcm(convKey, AesGcm.TagByteSizes.MaxSize);
        gcm.Encrypt(nonce, plaintextBytes, ciphertext, tag);

        // Store tag appended to ciphertext
        var combined = new byte[ciphertext.Length + tag.Length];
        Buffer.BlockCopy(ciphertext, 0, combined, 0, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, combined, ciphertext.Length, tag.Length);

        return (Convert.ToBase64String(combined), Convert.ToBase64String(nonce));
    }

    public string DecryptMessage(string ciphertextBase64, string ivBase64, byte[] convKey)
    {
        var combined = Convert.FromBase64String(ciphertextBase64);
        var nonce = Convert.FromBase64String(ivBase64);

        var ciphertext = combined[..^16];
        var tag = combined[^16..];
        var plaintext = new byte[ciphertext.Length];

        using var gcm = new AesGcm(convKey, AesGcm.TagByteSizes.MaxSize);
        gcm.Decrypt(nonce, ciphertext, tag, plaintext);

        return Encoding.UTF8.GetString(plaintext);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>Derives a 32-byte key from any string using SHA-256.</summary>
    private static byte[] DeriveKey(string keyString) =>
        SHA256.HashData(Encoding.UTF8.GetBytes(keyString));
}
