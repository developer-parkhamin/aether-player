namespace AetherPlayer
{
    internal static class AppConfig
    {
        public const string Version = "2.3.0";

        // Built-in auto-update source configured in code before release build:
        // - UpdateSourceType: "github" (GitHub Releases) or "feed" (direct latest.json URL)
        // - UpdateGithubRepo: "owner/repo" (e.g. "myname/aether-player")
        // - UpdateFeedUrl: "https://example.com/aether/latest.json"
        public const string UpdateSourceType = "github";
        public const string UpdateGithubRepo = "developer-parkhamin/aether-player";
        public const string UpdateFeedUrl = "";
        public const bool AutoCheckOnStartup = true;
    }
}
