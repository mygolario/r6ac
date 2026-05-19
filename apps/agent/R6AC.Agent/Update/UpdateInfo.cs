using System.Text.Json.Serialization;

namespace R6AC.Agent.Update;

public record UpdateInfo(
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("minVersion")] string MinVersion,
    [property: JsonPropertyName("downloadUrl")] string DownloadUrl,
    [property: JsonPropertyName("sha256")] string Sha256,
    [property: JsonPropertyName("signature")] string Signature,
    [property: JsonPropertyName("releaseNotes")] string ReleaseNotes,
    [property: JsonPropertyName("forceUpdate")] bool ForceUpdate
);

public record UpdateCheckResult(
    bool IsUpdateAvailable,
    bool IsForceUpdate,
    UpdateInfo? Info
);
