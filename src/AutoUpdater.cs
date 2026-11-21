using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace AetherPlayer
{
    internal sealed class UpdateConfig
    {
        public string SourceType { get; set; }
        public string GithubRepo { get; set; }
        public string FeedUrl { get; set; }
        public bool AutoCheckOnStartup { get; set; }

        public UpdateConfig()
        {
            SourceType = string.Equals(AppConfig.UpdateSourceType, "feed", StringComparison.OrdinalIgnoreCase) ? "feed" : "github";
            GithubRepo = AutoUpdater.NormalizeGithubRepo(AppConfig.UpdateGithubRepo);
            FeedUrl = (AppConfig.UpdateFeedUrl ?? string.Empty).Trim();
            AutoCheckOnStartup = AppConfig.AutoCheckOnStartup;
        }

        public bool IsConfigured()
        {
            if (string.Equals(SourceType, "feed", StringComparison.OrdinalIgnoreCase))
            {
                return !string.IsNullOrWhiteSpace(FeedUrl) &&
                    (FeedUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
                     FeedUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase));
            }
            string repo = AutoUpdater.NormalizeGithubRepo(GithubRepo);
            int slash = repo.IndexOf('/');
            return slash > 0 && slash < repo.Length - 1;
        }
    }

    internal sealed class UpdateCheckResult
    {
        public bool Success { get; set; }
        public bool HasConfig { get; set; }
        public bool UpdateAvailable { get; set; }
        public string CurrentVersion { get; set; }
        public string LatestVersion { get; set; }
        public string Notes { get; set; }
        public string DownloadUrl { get; set; }
        public string Sha256 { get; set; }
        public string ReleaseUrl { get; set; }
        public string Error { get; set; }
    }

    internal static class AutoUpdater
    {
        public const string CurrentVersion = AppConfig.Version;

        public static bool HasBuiltInSource()
        {
            UpdateConfig builtIn = new UpdateConfig();
            if (builtIn.IsConfigured()) return true;
            UpdateConfig bundled = TryReadConfigFile(GetBundledConfigPath());
            return bundled != null && bundled.IsConfigured();
        }

        private static string GetUserConfigPath()
        {
            string dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AetherPlayer"
            );
            return Path.Combine(dir, "update-config.json");
        }

        private static string GetBundledConfigPath()
        {
            return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "update-config.json");
        }

        public static string NormalizeGithubRepo(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            string s = raw.Trim();
            if (s.StartsWith("https://github.com/", StringComparison.OrdinalIgnoreCase))
            {
                s = s.Substring("https://github.com/".Length);
            }
            else if (s.StartsWith("http://github.com/", StringComparison.OrdinalIgnoreCase))
            {
                s = s.Substring("http://github.com/".Length);
            }
            if (s.EndsWith(".git", StringComparison.OrdinalIgnoreCase))
            {
                s = s.Substring(0, s.Length - 4);
            }
            s = s.Trim('/');
            string[] parts = s.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                return parts[0] + "/" + parts[1];
            }
            return s;
        }

        public static UpdateConfig LoadConfig()
        {
            UpdateConfig baseCfg = new UpdateConfig();

            UpdateConfig bundled = TryReadConfigFile(GetBundledConfigPath());
            if (bundled != null && bundled.IsConfigured())
            {
                baseCfg.SourceType = bundled.SourceType;
                baseCfg.GithubRepo = bundled.GithubRepo;
                baseCfg.FeedUrl = bundled.FeedUrl;
                baseCfg.AutoCheckOnStartup = bundled.AutoCheckOnStartup;
            }

            UpdateConfig userCfg = TryReadConfigFile(GetUserConfigPath());
            if (userCfg != null)
            {
                baseCfg.AutoCheckOnStartup = userCfg.AutoCheckOnStartup;
                if (!baseCfg.IsConfigured() && userCfg.IsConfigured())
                {
                    baseCfg.SourceType = userCfg.SourceType;
                    baseCfg.GithubRepo = userCfg.GithubRepo;
                    baseCfg.FeedUrl = userCfg.FeedUrl;
                }
            }

            return baseCfg;
        }

        private static UpdateConfig TryReadConfigFile(string path)
        {
            try
            {
                if (!File.Exists(path)) return null;
                string json = File.ReadAllText(path, Encoding.UTF8);
                JavaScriptSerializer ser = new JavaScriptSerializer();
                Dictionary<string, object> dict = ser.Deserialize<Dictionary<string, object>>(json);
                if (dict == null) return null;

                UpdateConfig cfg = new UpdateConfig();
                cfg.SourceType = GetDictStr(dict, "sourceType", "github");
                cfg.GithubRepo = NormalizeGithubRepo(GetDictStr(dict, "githubRepo", string.Empty));
                cfg.FeedUrl = GetDictStr(dict, "feedUrl", string.Empty).Trim();
                cfg.AutoCheckOnStartup = GetDictBool(dict, "autoCheckOnStartup", true);
                return cfg;
            }
            catch
            {
                return null;
            }
        }

        public static void SaveConfig(UpdateConfig cfg)
        {
            if (cfg == null) return;
            cfg.GithubRepo = NormalizeGithubRepo(cfg.GithubRepo);
            cfg.FeedUrl = (cfg.FeedUrl ?? string.Empty).Trim();
            if (!string.Equals(cfg.SourceType, "feed", StringComparison.OrdinalIgnoreCase))
            {
                cfg.SourceType = "github";
            }
            else
            {
                cfg.SourceType = "feed";
            }

            string path = GetUserConfigPath();
            string dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            Dictionary<string, object> dict = new Dictionary<string, object>
            {
                { "sourceType", cfg.SourceType },
                { "githubRepo", cfg.GithubRepo },
                { "feedUrl", cfg.FeedUrl },
                { "autoCheckOnStartup", cfg.AutoCheckOnStartup }
            };
            JavaScriptSerializer ser = new JavaScriptSerializer();
            File.WriteAllText(path, ser.Serialize(dict), new UTF8Encoding(false));
        }

        public static int CompareVersions(string a, string b)
        {
            int[] pa = ParseVersionParts(a);
            int[] pb = ParseVersionParts(b);
            int len = Math.Max(pa.Length, pb.Length);
            for (int i = 0; i < len; i++)
            {
                int va = i < pa.Length ? pa[i] : 0;
                int vb = i < pb.Length ? pb[i] : 0;
                if (va < vb) return -1;
                if (va > vb) return 1;
            }
            return 0;
        }

        private static int[] ParseVersionParts(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new[] { 0 };
            string s = raw.Trim();
            if (s.StartsWith("v", StringComparison.OrdinalIgnoreCase))
            {
                s = s.Substring(1);
            }
            int dash = s.IndexOf('-');
            if (dash >= 0) s = s.Substring(0, dash);
            int plus = s.IndexOf('+');
            if (plus >= 0) s = s.Substring(0, plus);

            string[] tokens = s.Split('.');
            int[] nums = new int[tokens.Length];
            for (int i = 0; i < tokens.Length; i++)
            {
                int val;
                if (!int.TryParse(tokens[i], NumberStyles.Integer, CultureInfo.InvariantCulture, out val))
                {
                    val = 0;
                }
                nums[i] = val;
            }
            return nums;
        }

        public static Task<UpdateCheckResult> CheckForUpdatesAsync(UpdateConfig config)
        {
            return Task.Run(delegate
            {
                UpdateCheckResult res = new UpdateCheckResult();
                res.CurrentVersion = CurrentVersion;

                if (config == null || !config.IsConfigured())
                {
                    res.Success = false;
                    res.HasConfig = false;
                    res.Error = "업데이트 소스가 아직 설정되지 않았습니다 (src/AppConfig.cs 또는 앱 설정에서 지정 가능).";
                    return res;
                }

                res.HasConfig = true;
                try
                {
                    EnableTls12();
                    if (string.Equals(config.SourceType, "feed", StringComparison.OrdinalIgnoreCase))
                    {
                        return CheckCustomFeed(config.FeedUrl, res);
                    }
                    return CheckGithubRelease(NormalizeGithubRepo(config.GithubRepo), res);
                }
                catch (WebException wex)
                {
                    res.Success = false;
                    HttpWebResponse httpResp = wex.Response as HttpWebResponse;
                    if (httpResp != null)
                    {
                        res.Error = string.Format(CultureInfo.InvariantCulture, "서버 응답 오류 (HTTP {0})", (int)httpResp.StatusCode);
                    }
                    else
                    {
                        res.Error = "업데이트 서버 연결 실패: " + wex.Message;
                    }
                    return res;
                }
                catch (Exception ex)
                {
                    res.Success = false;
                    res.Error = "업데이트 확인 실패: " + ex.Message;
                    return res;
                }
            });
        }

        private static UpdateCheckResult CheckGithubRelease(string repo, UpdateCheckResult res)
        {
            string apiUrl = string.Format(CultureInfo.InvariantCulture, "https://api.github.com/repos/{0}/releases/latest", repo);
            string json = FetchJsonString(apiUrl, "application/vnd.github+json");
            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<string, object> root = ser.Deserialize<Dictionary<string, object>>(json);
            if (root == null) throw new InvalidOperationException("GitHub 응답을 해석할 수 없습니다.");

            string tag = GetDictStr(root, "tag_name", string.Empty);
            string cleanVer = tag.Trim().TrimStart('v', 'V');
            string body = GetDictStr(root, "body", string.Empty);
            string htmlUrl = GetDictStr(root, "html_url", string.Empty);

            string chosenUrl = string.Empty;
            string fallbackExe = string.Empty;
            object rawAssets;
            if (root.TryGetValue("assets", out rawAssets) && rawAssets is ArrayList)
            {
                ArrayList assets = (ArrayList)rawAssets;
                foreach (object item in assets)
                {
                    Dictionary<string, object> asset = item as Dictionary<string, object>;
                    if (asset == null) continue;
                    string name = GetDictStr(asset, "name", string.Empty);
                    string dl = GetDictStr(asset, "browser_download_url", string.Empty);
                    if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    {
                        if (string.IsNullOrEmpty(fallbackExe)) fallbackExe = dl;
                        if (name.IndexOf("setup", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            chosenUrl = dl;
                            break;
                        }
                    }
                }
            }
            if (string.IsNullOrEmpty(chosenUrl)) chosenUrl = fallbackExe;

            res.Success = true;
            res.LatestVersion = cleanVer;
            res.Notes = body;
            res.DownloadUrl = chosenUrl;
            res.ReleaseUrl = htmlUrl;
            res.Sha256 = string.Empty;
            res.UpdateAvailable = !string.IsNullOrEmpty(cleanVer) && CompareVersions(CurrentVersion, cleanVer) < 0;
            return res;
        }

        private static UpdateCheckResult CheckCustomFeed(string feedUrl, UpdateCheckResult res)
        {
            string json = FetchJsonString(feedUrl, "application/json");
            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<string, object> root = ser.Deserialize<Dictionary<string, object>>(json);
            if (root == null) throw new InvalidOperationException("업데이트 피드 JSON이 올바르지 않습니다.");

            string ver = GetDictStr(root, "version", string.Empty).Trim().TrimStart('v', 'V');
            string notes = GetDictStr(root, "notes", string.Empty);
            string dlUrl = GetDictStr(root, "downloadUrl", string.Empty).Trim();
            string sha = GetDictStr(root, "sha256", string.Empty).Trim().ToLowerInvariant();
            string relUrl = GetDictStr(root, "releaseUrl", string.Empty).Trim();

            res.Success = true;
            res.LatestVersion = ver;
            res.Notes = notes;
            res.DownloadUrl = dlUrl;
            res.Sha256 = sha;
            res.ReleaseUrl = relUrl;
            res.UpdateAvailable = !string.IsNullOrEmpty(ver) && CompareVersions(CurrentVersion, ver) < 0;
            return res;
        }

        public static Task<string> DownloadUpdateAsync(UpdateCheckResult info, Action<int, long, long> onProgress)
        {
            return Task.Run(delegate
            {
                if (info == null || string.IsNullOrWhiteSpace(info.DownloadUrl))
                {
                    throw new InvalidOperationException("다운로드할 설치 파일 URL이 없습니다.");
                }
                string url = info.DownloadUrl.Trim();
                if (!url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
                    !url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("허용되지 않는 업데이트 URL 프로토콜입니다.");
                }

                EnableTls12();
                string tempDir = Path.Combine(Path.GetTempPath(), "AetherPlayerUpdate");
                Directory.CreateDirectory(tempDir);
                string partFile = Path.Combine(tempDir, "AETHER Player Setup.exe.part");
                string targetFile = Path.Combine(tempDir, "AETHER Player Setup.exe");
                if (File.Exists(partFile)) File.Delete(partFile);
                if (File.Exists(targetFile)) File.Delete(targetFile);

                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Method = "GET";
                req.UserAgent = "AETHER-Player/" + CurrentVersion;
                req.Timeout = 30000;
                req.AllowAutoRedirect = true;

                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    long total = resp.ContentLength;
                    long received = 0;
                    int lastReportedPct = -1;
                    byte[] buffer = new byte[65536];

                    using (Stream netStream = resp.GetResponseStream())
                    using (FileStream fs = new FileStream(partFile, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        int read;
                        while ((read = netStream.Read(buffer, 0, buffer.Length)) > 0)
                        {
                            fs.Write(buffer, 0, read);
                            received += read;
                            int pct = total > 0 ? (int)Math.Min(100, (received * 100L) / total) : 50;
                            if (onProgress != null && pct != lastReportedPct)
                            {
                                lastReportedPct = pct;
                                onProgress(pct, received, total);
                            }
                        }
                    }

                    if (onProgress != null) onProgress(100, received, total > 0 ? total : received);
                }

                FileInfo fi = new FileInfo(partFile);
                if (!fi.Exists || fi.Length < 65536)
                {
                    throw new InvalidOperationException("다운로드된 설치 파일 크기가 비정상적입니다.");
                }

                // Verify Windows PE 'MZ' header
                byte[] magic = new byte[2];
                using (FileStream checkFs = File.OpenRead(partFile))
                {
                    if (checkFs.Read(magic, 0, 2) != 2 || magic[0] != 0x4D || magic[1] != 0x5A)
                    {
                        throw new InvalidOperationException("다운로드된 파일이 올바른 Windows 실행 파일이 아닙니다.");
                    }
                }

                // Optional SHA-256 verification
                if (!string.IsNullOrWhiteSpace(info.Sha256))
                {
                    string actualHash = ComputeSha256(partFile);
                    if (!string.Equals(actualHash, info.Sha256.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException("다운로드된 업데이트의 SHA-256 무결성 검증에 실패했습니다.");
                    }
                }

                File.Move(partFile, targetFile);
                return targetFile;
            });
        }

        public static string ComputeSha256(string filePath)
        {
            using (SHA256Managed sha = new SHA256Managed())
            using (FileStream fs = File.OpenRead(filePath))
            {
                byte[] hash = sha.ComputeHash(fs);
                StringBuilder sb = new StringBuilder(hash.Length * 2);
                for (int i = 0; i < hash.Length; i++)
                {
                    sb.Append(hash[i].ToString("x2", CultureInfo.InvariantCulture));
                }
                return sb.ToString();
            }
        }

        public static void LaunchSilentUpgrade(string installerPath, string installDir, int currentPid)
        {
            string cleanDir = installDir.TrimEnd('\\', '"');
            string args = string.Format(
                CultureInfo.InvariantCulture,
                "--silent --wait-pid={0} --dir=\"{1}\" --launch",
                currentPid,
                cleanDir
            );
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = installerPath;
            psi.Arguments = args;
            psi.UseShellExecute = true;
            Process.Start(psi);
        }

        private static string FetchJsonString(string url, string accept)
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "GET";
            req.UserAgent = "AETHER-Player/" + CurrentVersion;
            req.Accept = accept;
            req.Timeout = 10000;
            req.AllowAutoRedirect = true;

            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            using (Stream s = resp.GetResponseStream())
            using (StreamReader sr = new StreamReader(s, Encoding.UTF8))
            {
                return sr.ReadToEnd();
            }
        }

        private static void EnableTls12()
        {
            try
            {
                ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072;
            }
            catch { }
        }

        private static string GetDictStr(Dictionary<string, object> dict, string key, string fallback)
        {
            object val;
            if (dict.TryGetValue(key, out val) && val != null) return Convert.ToString(val, CultureInfo.InvariantCulture);
            return fallback;
        }

        private static bool GetDictBool(Dictionary<string, object> dict, string key, bool fallback)
        {
            object val;
            if (dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToBoolean(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }
    }
}
