using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace AetherPlayer
{
    internal sealed class YoutubeSettings
    {
        public string SaveDir { get; set; }
        public bool AutoPlay { get; set; }
    }

    internal sealed class YoutubeEngineStatus
    {
        public bool HasYtdlp { get; set; }
        public bool HasQuickJs { get; set; }
        public bool HasFfmpeg { get; set; }
        public string FfmpegSource { get; set; }
        public string BinDir { get; set; }
    }

    internal sealed class YoutubeResolutionOption
    {
        public int Height { get; set; }
        public int Width { get; set; }
        public int ShortSide { get; set; }
        public double Fps { get; set; }
        public bool IsPortrait { get; set; }
        public long EstimatedBytes { get; set; }
        public string Codec { get; set; }
        public string Label { get; set; }
        public string Badge { get; set; }
    }

    internal sealed class YoutubeVideoInfo
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Channel { get; set; }
        public double Duration { get; set; }
        public string Thumbnail { get; set; }
        public string WebpageUrl { get; set; }
        public List<YoutubeResolutionOption> Resolutions { get; set; }
    }

    internal sealed class YoutubeDownloadRequest
    {
        public string Url { get; set; }
        public string Format { get; set; }
        public int MaxHeight { get; set; }
        public int ShortSide { get; set; }
        public int AudioBitrate { get; set; }
        public string SaveDir { get; set; }
        public bool AutoPlay { get; set; }
        public string Title { get; set; }
        public string Thumbnail { get; set; }
        public string QualityLabel { get; set; }
    }

    internal sealed class YoutubeDownloadResult
    {
        public string FilePath { get; set; }
        public string FileName { get; set; }
        public string Format { get; set; }
        public long FileSize { get; set; }
        public bool AutoPlay { get; set; }
    }

    internal static class YoutubeDownloader
    {
        private const string YtdlpReleaseUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
        private const string QuickJsReleaseUrl = "https://github.com/quickjs-ng/quickjs/releases/latest/download/qjs-windows-x86_64.exe";
        private const string FfmpegReleaseUrl = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip";

        private static readonly SemaphoreSlim BootstrapLock = new SemaphoreSlim(1, 1);

        public static string GetAppDataDir()
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AetherPlayer"
            );
        }

        public static string GetBinDir()
        {
            return Path.Combine(GetAppDataDir(), "bin");
        }

        public static string GetYtdlpPath()
        {
            return Path.Combine(GetBinDir(), "yt-dlp.exe");
        }

        public static string GetQjsPath()
        {
            return Path.Combine(GetBinDir(), "qjs.exe");
        }

        public static string GetBundledFfmpegDir()
        {
            return Path.Combine(GetBinDir(), "ffmpeg");
        }

        private static string GetSettingsPath()
        {
            return Path.Combine(GetAppDataDir(), "yt-settings.json");
        }

        public static string GetDefaultSaveDir()
        {
            string profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string downloads = Path.Combine(profile, "Downloads");
            if (Directory.Exists(downloads))
            {
                return Path.Combine(downloads, "AETHER");
            }
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "AETHER");
        }

        public static YoutubeSettings LoadSettings()
        {
            YoutubeSettings s = new YoutubeSettings();
            s.SaveDir = GetDefaultSaveDir();
            s.AutoPlay = true;

            try
            {
                string path = GetSettingsPath();
                if (!File.Exists(path)) return s;
                string json = File.ReadAllText(path, Encoding.UTF8);
                JavaScriptSerializer ser = new JavaScriptSerializer();
                Dictionary<string, object> dict = ser.Deserialize<Dictionary<string, object>>(json);
                if (dict == null) return s;

                string dir = GetDictStr(dict, "saveDir", string.Empty);
                if (!string.IsNullOrWhiteSpace(dir))
                {
                    s.SaveDir = dir.Trim();
                }
                s.AutoPlay = GetDictBool(dict, "autoPlay", true);
            }
            catch { }

            return s;
        }

        public static void SaveSettings(YoutubeSettings settings)
        {
            if (settings == null) return;
            try
            {
                string path = GetSettingsPath();
                string parent = Path.GetDirectoryName(path);
                if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);

                Dictionary<string, object> dict = new Dictionary<string, object>
                {
                    { "saveDir", string.IsNullOrWhiteSpace(settings.SaveDir) ? GetDefaultSaveDir() : settings.SaveDir.Trim() },
                    { "autoPlay", settings.AutoPlay }
                };
                JavaScriptSerializer ser = new JavaScriptSerializer();
                File.WriteAllText(path, ser.Serialize(dict), new UTF8Encoding(false));
            }
            catch { }
        }

        public static string FindWorkingFfmpegDir()
        {
            string bundled = GetBundledFfmpegDir();
            if (File.Exists(Path.Combine(bundled, "ffmpeg.exe")) &&
                File.Exists(Path.Combine(bundled, "ffprobe.exe")))
            {
                return bundled;
            }

            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
            string[] dirs = pathEnv.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < dirs.Length; i++)
            {
                try
                {
                    string d = dirs[i].Trim().Trim('"');
                    if (string.IsNullOrEmpty(d)) continue;
                    if (File.Exists(Path.Combine(d, "ffmpeg.exe")) &&
                        File.Exists(Path.Combine(d, "ffprobe.exe")))
                    {
                        return d;
                    }
                }
                catch { }
            }

            return null;
        }

        public static YoutubeEngineStatus GetEngineStatus()
        {
            YoutubeEngineStatus st = new YoutubeEngineStatus();
            st.BinDir = GetBinDir();
            st.HasYtdlp = File.Exists(GetYtdlpPath());
            st.HasQuickJs = File.Exists(GetQjsPath());
            string ffDir = FindWorkingFfmpegDir();
            st.HasFfmpeg = !string.IsNullOrEmpty(ffDir);
            if (!st.HasFfmpeg) st.FfmpegSource = "missing";
            else if (string.Equals(ffDir, GetBundledFfmpegDir(), StringComparison.OrdinalIgnoreCase)) st.FfmpegSource = "bundled";
            else st.FfmpegSource = "system";
            return st;
        }

        public static bool IsYoutubeUrl(string raw)
        {
            return !string.IsNullOrEmpty(NormalizeYoutubeUrl(raw));
        }

        public static string NormalizeYoutubeUrl(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            string s = raw.Trim();
            if (s.IndexOf('\n') >= 0 || s.IndexOf('\r') >= 0 || s.IndexOf(' ') >= 0)
            {
                string[] parts = s.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                s = null;
                for (int i = 0; i < parts.Length; i++)
                {
                    if (parts[i].IndexOf("youtube.com", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        parts[i].IndexOf("youtu.be", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        s = parts[i].Trim();
                        break;
                    }
                }
                if (string.IsNullOrEmpty(s)) return null;
            }

            if (!s.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !s.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                if (s.StartsWith("youtube.com/", StringComparison.OrdinalIgnoreCase) ||
                    s.StartsWith("www.youtube.com/", StringComparison.OrdinalIgnoreCase) ||
                    s.StartsWith("m.youtube.com/", StringComparison.OrdinalIgnoreCase) ||
                    s.StartsWith("music.youtube.com/", StringComparison.OrdinalIgnoreCase) ||
                    s.StartsWith("youtu.be/", StringComparison.OrdinalIgnoreCase))
                {
                    s = "https://" + s;
                }
                else
                {
                    return null;
                }
            }

            Uri uri;
            if (!Uri.TryCreate(s, UriKind.Absolute, out uri)) return null;
            if (!string.Equals(uri.Scheme, "https", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(uri.Scheme, "http", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            string host = (uri.Host ?? string.Empty).ToLowerInvariant();
            if (host == "youtu.be")
            {
                string slug = uri.AbsolutePath.Trim('/');
                if (string.IsNullOrEmpty(slug)) return null;
                return uri.AbsoluteUri;
            }

            if (host == "youtube.com" || host == "www.youtube.com" || host == "m.youtube.com" || host == "music.youtube.com")
            {
                string path = (uri.AbsolutePath ?? "/").TrimEnd('/').ToLowerInvariant();
                if (path == "/watch")
                {
                    return HasNonEmptyQueryParam(uri.Query, "v") ? uri.AbsoluteUri : null;
                }
                if (path.StartsWith("/shorts/", StringComparison.Ordinal) ||
                    path.StartsWith("/live/", StringComparison.Ordinal) ||
                    path.StartsWith("/embed/", StringComparison.Ordinal) ||
                    path.StartsWith("/v/", StringComparison.Ordinal))
                {
                    string[] segs = uri.AbsolutePath.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
                    return segs.Length >= 2 && !string.IsNullOrWhiteSpace(segs[1]) ? uri.AbsoluteUri : null;
                }
                return null;
            }

            return null;
        }

        private static bool HasNonEmptyQueryParam(string query, string key)
        {
            if (string.IsNullOrEmpty(query)) return false;
            string q = query.TrimStart('?');
            string[] pairs = q.Split('&');
            for (int i = 0; i < pairs.Length; i++)
            {
                int eq = pairs[i].IndexOf('=');
                if (eq <= 0) continue;
                string k = pairs[i].Substring(0, eq);
                string v = pairs[i].Substring(eq + 1);
                if (string.Equals(k, key, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(v))
                {
                    return true;
                }
            }
            return false;
        }

        public static List<YoutubeResolutionOption> BuildResolutionOptions(IList rawFormats, double durationSeconds)
        {
            List<YoutubeResolutionOption> results = new List<YoutubeResolutionOption>();
            if (rawFormats == null || rawFormats.Count == 0) return results;

            long bestAudioBytes = 0;
            for (int i = 0; i < rawFormats.Count; i++)
            {
                Dictionary<string, object> f = rawFormats[i] as Dictionary<string, object>;
                if (f == null) continue;
                string vcodec = GetDictStr(f, "vcodec", string.Empty);
                string acodec = GetDictStr(f, "acodec", string.Empty);
                if (string.Equals(vcodec, "none", StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(acodec) &&
                    !string.Equals(acodec, "none", StringComparison.OrdinalIgnoreCase))
                {
                    long bytes = EstimateFormatBytes(f, durationSeconds);
                    if (bytes > bestAudioBytes) bestAudioBytes = bytes;
                }
            }

            Dictionary<int, YoutubeResolutionOption> bestByShortSide = new Dictionary<int, YoutubeResolutionOption>();
            Dictionary<int, int> rankByShortSide = new Dictionary<int, int>();

            for (int i = 0; i < rawFormats.Count; i++)
            {
                Dictionary<string, object> f = rawFormats[i] as Dictionary<string, object>;
                if (f == null) continue;

                string ext = GetDictStr(f, "ext", string.Empty).ToLowerInvariant();
                if (ext == "mhtml") continue;

                string vcodec = GetDictStr(f, "vcodec", string.Empty);
                if (string.IsNullOrWhiteSpace(vcodec) || string.Equals(vcodec, "none", StringComparison.OrdinalIgnoreCase)) continue;

                int height = GetDictInt(f, "height", 0);
                int width = GetDictInt(f, "width", 0);
                if (height < 144) continue;

                int shortSide = (width > 0 && height > 0) ? Math.Min(width, height) : height;
                bool isPortrait = width > 0 && height > width;
                double fps = GetDictDouble(f, "fps", 30.0);
                string acodec = GetDictStr(f, "acodec", string.Empty);
                bool hasAudio = !string.IsNullOrWhiteSpace(acodec) && !string.Equals(acodec, "none", StringComparison.OrdinalIgnoreCase);

                long videoBytes = EstimateFormatBytes(f, durationSeconds);
                long totalBytes = videoBytes > 0 ? (videoBytes + (hasAudio ? 0 : bestAudioBytes)) : 0;

                int rank = 0;
                if (fps >= 50.0) rank += 1000;
                if (vcodec.IndexOf("avc", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    vcodec.IndexOf("h264", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    rank += 200;
                }
                else if (vcodec.IndexOf("vp9", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    rank += 100;
                }
                rank += (int)Math.Min(120, Math.Round(fps));

                int prevRank;
                if (!rankByShortSide.TryGetValue(shortSide, out prevRank) || rank > prevRank)
                {
                    rankByShortSide[shortSide] = rank;
                    YoutubeResolutionOption opt = new YoutubeResolutionOption();
                    opt.Height = height;
                    opt.Width = width;
                    opt.ShortSide = shortSide;
                    opt.Fps = fps;
                    opt.IsPortrait = isPortrait;
                    opt.EstimatedBytes = totalBytes;
                    opt.Codec = vcodec;
                    opt.Badge = FormatResolutionTag(shortSide);
                    opt.Label = FormatResolutionLabel(shortSide, fps, isPortrait);
                    bestByShortSide[shortSide] = opt;
                }
            }

            foreach (YoutubeResolutionOption opt in bestByShortSide.Values)
            {
                results.Add(opt);
            }

            results.Sort(delegate(YoutubeResolutionOption a, YoutubeResolutionOption b)
            {
                return b.ShortSide.CompareTo(a.ShortSide);
            });

            return results;
        }

        private static long EstimateFormatBytes(Dictionary<string, object> f, double durationSeconds)
        {
            long exact = GetDictLong(f, "filesize", 0);
            if (exact > 0) return exact;
            long approx = GetDictLong(f, "filesize_approx", 0);
            if (approx > 0) return approx;
            double tbr = GetDictDouble(f, "tbr", 0);
            if (tbr > 0 && durationSeconds > 0)
            {
                return (long)(tbr * 1000.0 / 8.0 * durationSeconds);
            }
            return 0;
        }

        private static string FormatResolutionTag(int shortSide)
        {
            if (shortSide >= 4320) return "8K";
            if (shortSide >= 2160) return "4K";
            if (shortSide >= 1440) return "2K";
            if (shortSide >= 1080) return "FHD";
            if (shortSide >= 720) return "HD";
            return string.Empty;
        }

        private static string FormatResolutionLabel(int shortSide, double fps, bool isPortrait)
        {
            string tag = FormatResolutionTag(shortSide);
            StringBuilder sb = new StringBuilder();
            sb.Append(shortSide).Append('p');
            if (!string.IsNullOrEmpty(tag)) sb.Append(' ').Append(tag);
            if (fps >= 50.0) sb.Append(" 60fps");
            if (isPortrait) sb.Append(" 세로");
            return sb.ToString();
        }

        public static Task EnsureEngineReadyAsync(bool needFfmpeg, Action<string, int, string> onProgress, CancellationToken ct)
        {
            return EnsureEngineInternalAsync(needFfmpeg, false, onProgress, ct);
        }

        public static Task UpdateEngineAsync(Action<string, int, string> onProgress, CancellationToken ct)
        {
            return EnsureEngineInternalAsync(false, true, onProgress, ct);
        }

        private static async Task EnsureEngineInternalAsync(bool needFfmpeg, bool forceYtdlpUpdate, Action<string, int, string> onProgress, CancellationToken ct)
        {
            await BootstrapLock.WaitAsync(ct).ConfigureAwait(false);
            try
            {
                EnableTls12();
                string binDir = GetBinDir();
                Directory.CreateDirectory(binDir);

                string ytdlpPath = GetYtdlpPath();
                if (forceYtdlpUpdate || !File.Exists(ytdlpPath) || new FileInfo(ytdlpPath).Length < 1024 * 1024)
                {
                    await DownloadBinaryWithProgressAsync(
                        YtdlpReleaseUrl,
                        ytdlpPath,
                        "yt-dlp",
                        forceYtdlpUpdate ? "유튜브 엔진(yt-dlp) 최신 버전 업데이트 중..." : "유튜브 다운로드 엔진(yt-dlp) 자동 설치 중...",
                        onProgress,
                        ct
                    ).ConfigureAwait(false);
                }

                string qjsPath = GetQjsPath();
                if (!File.Exists(qjsPath) || new FileInfo(qjsPath).Length < 100 * 1024)
                {
                    await DownloadBinaryWithProgressAsync(
                        QuickJsReleaseUrl,
                        qjsPath,
                        "quickjs",
                        "초경량 JS 런타임(QuickJS) 설치 중...",
                        onProgress,
                        ct
                    ).ConfigureAwait(false);
                }

                if (needFfmpeg && string.IsNullOrEmpty(FindWorkingFfmpegDir()))
                {
                    await DownloadAndInstallFfmpegAsync(onProgress, ct).ConfigureAwait(false);
                }

                if (onProgress != null)
                {
                    onProgress("ready", 100, "유튜브 엔진 준비 완료");
                }
            }
            finally
            {
                BootstrapLock.Release();
            }
        }

        private static async Task DownloadAndInstallFfmpegAsync(Action<string, int, string> onProgress, CancellationToken ct)
        {
            string binDir = GetBinDir();
            Directory.CreateDirectory(binDir);

            string tempZip = Path.Combine(binDir, "ffmpeg_dl_" + Guid.NewGuid().ToString("N") + ".zip");
            string stagingDir = Path.Combine(binDir, "ffmpeg_staging_" + Guid.NewGuid().ToString("N"));
            string finalDir = GetBundledFfmpegDir();

            try
            {
                await DownloadBinaryWithProgressAsync(
                    FfmpegReleaseUrl,
                    tempZip,
                    "ffmpeg",
                    "FFmpeg 병합·MP3 변환 엔진 다운로드 중 (최초 1회)...",
                    delegate(string stage, int pct, string msg)
                    {
                        int mapped = Math.Max(0, Math.Min(85, (int)Math.Round(pct * 0.85)));
                        if (onProgress != null) onProgress(stage, mapped, msg);
                    },
                    ct
                ).ConfigureAwait(false);

                ct.ThrowIfCancellationRequested();
                if (onProgress != null) onProgress("ffmpeg", 90, "FFmpeg 압축 해제 및 검증 중...");

                Directory.CreateDirectory(stagingDir);
                using (ZipArchive archive = ZipFile.OpenRead(tempZip))
                {
                    for (int i = 0; i < archive.Entries.Count; i++)
                    {
                        ct.ThrowIfCancellationRequested();
                        ZipArchiveEntry entry = archive.Entries[i];
                        if (string.IsNullOrEmpty(entry.Name)) continue;

                        string norm = entry.FullName.Replace('\\', '/');
                        if (norm.IndexOf("/bin/", StringComparison.OrdinalIgnoreCase) < 0 &&
                            !norm.StartsWith("bin/", StringComparison.OrdinalIgnoreCase))
                        {
                            continue;
                        }

                        string lowerName = entry.Name.ToLowerInvariant();
                        if (!lowerName.EndsWith(".exe", StringComparison.Ordinal) &&
                            !lowerName.EndsWith(".dll", StringComparison.Ordinal))
                        {
                            continue;
                        }
                        if (lowerName == "ffplay.exe") continue;

                        string outFile = Path.Combine(stagingDir, entry.Name);
                        entry.ExtractToFile(outFile, true);
                    }
                }

                if (!File.Exists(Path.Combine(stagingDir, "ffmpeg.exe")) ||
                    !File.Exists(Path.Combine(stagingDir, "ffprobe.exe")))
                {
                    throw new InvalidOperationException("FFmpeg 패키지에서 ffmpeg.exe / ffprobe.exe를 찾지 못했습니다.");
                }

                if (Directory.Exists(finalDir))
                {
                    Directory.Delete(finalDir, true);
                }
                Directory.Move(stagingDir, finalDir);
                stagingDir = null;

                if (onProgress != null) onProgress("ffmpeg", 100, "FFmpeg 설치 완료");
            }
            finally
            {
                if (File.Exists(tempZip))
                {
                    try { File.Delete(tempZip); } catch { }
                }
                if (!string.IsNullOrEmpty(stagingDir) && Directory.Exists(stagingDir))
                {
                    try { Directory.Delete(stagingDir, true); } catch { }
                }
            }
        }

        private static Task DownloadBinaryWithProgressAsync(
            string url,
            string destPath,
            string stage,
            string message,
            Action<string, int, string> onProgress,
            CancellationToken ct)
        {
            return Task.Run(delegate
            {
                string tmpPath = destPath + ".tmp." + Guid.NewGuid().ToString("N");
                try
                {
                    if (onProgress != null) onProgress(stage, 0, message);
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                    req.UserAgent = "AETHER-Player/" + AppConfig.Version;
                    req.AllowAutoRedirect = true;
                    req.Timeout = 45000;
                    req.ReadWriteTimeout = 60000;

                    using (ct.Register(delegate { try { req.Abort(); } catch { } }))
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    using (Stream remote = resp.GetResponseStream())
                    using (FileStream fs = new FileStream(tmpPath, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        long total = resp.ContentLength;
                        long received = 0;
                        byte[] buf = new byte[81920];
                        int lastPct = -1;
                        int read;
                        while ((read = remote.Read(buf, 0, buf.Length)) > 0)
                        {
                            ct.ThrowIfCancellationRequested();
                            fs.Write(buf, 0, read);
                            received += read;
                            if (total > 0)
                            {
                                int pct = (int)Math.Min(100, (received * 100L) / total);
                                if (pct != lastPct)
                                {
                                    lastPct = pct;
                                    if (onProgress != null)
                                    {
                                        double recMb = received / (1024.0 * 1024.0);
                                        double totMb = total / (1024.0 * 1024.0);
                                        onProgress(
                                            stage,
                                            pct,
                                            string.Format(CultureInfo.InvariantCulture, "{0} ({1:0.0} / {2:0.0} MB)", message, recMb, totMb)
                                        );
                                    }
                                }
                            }
                        }
                    }

                    ct.ThrowIfCancellationRequested();
                    if (File.Exists(destPath)) File.Delete(destPath);
                    File.Move(tmpPath, destPath);
                    tmpPath = null;
                    if (onProgress != null) onProgress(stage, 100, message);
                }
                finally
                {
                    if (!string.IsNullOrEmpty(tmpPath) && File.Exists(tmpPath))
                    {
                        try { File.Delete(tmpPath); } catch { }
                    }
                }
            }, ct);
        }

        public static async Task<YoutubeVideoInfo> FetchVideoInfoAsync(string rawUrl, Action<string, int, string> onStatus, CancellationToken ct)
        {
            string url = NormalizeYoutubeUrl(rawUrl);
            if (string.IsNullOrEmpty(url))
            {
                throw new ArgumentException("올바른 YouTube 동영상 또는 Shorts 링크를 입력해 주세요.");
            }

            await EnsureEngineReadyAsync(false, onStatus, ct).ConfigureAwait(false);
            ct.ThrowIfCancellationRequested();

            if (onStatus != null) onStatus("fetch", 100, "유튜브 영상 정보 및 지원 해상도를 불러오는 중...");

            string qjsPath = GetQjsPath();
            string args = string.Format(
                CultureInfo.InvariantCulture,
                "--no-playlist --dump-single-json --no-warnings --encoding utf-8 --js-runtimes \"{0}\" \"{1}\"",
                "quickjs:" + qjsPath,
                url
            );

            ProcessStartInfo psi = CreateUtf8ProcessStartInfo(GetYtdlpPath(), args);
            string stdout = string.Empty;
            string stderr = string.Empty;
            int exitCode = await RunProcessCaptureAsync(psi, ct, delegate(string o, string e)
            {
                stdout = o;
                stderr = e;
            }).ConfigureAwait(false);

            if (exitCode != 0 || string.IsNullOrWhiteSpace(stdout))
            {
                string detail = ExtractCleanYtdlpError(stderr);
                throw new InvalidOperationException(string.IsNullOrEmpty(detail) ? "영상 정보를 가져오지 못했습니다." : detail);
            }

            JavaScriptSerializer ser = new JavaScriptSerializer();
            ser.MaxJsonLength = 32 * 1024 * 1024;
            Dictionary<string, object> root = ser.Deserialize<Dictionary<string, object>>(stdout);
            if (root == null)
            {
                throw new InvalidOperationException("유튜브 응답 데이터를 해석하지 못했습니다.");
            }

            YoutubeVideoInfo info = new YoutubeVideoInfo();
            info.Id = GetDictStr(root, "id", string.Empty);
            info.Title = GetDictStr(root, "title", "YouTube Media");
            info.Channel = GetDictStr(root, "channel", string.Empty);
            if (string.IsNullOrEmpty(info.Channel)) info.Channel = GetDictStr(root, "uploader", string.Empty);
            info.Duration = GetDictDouble(root, "duration", 0);
            info.Thumbnail = GetDictStr(root, "thumbnail", string.Empty);
            info.WebpageUrl = GetDictStr(root, "webpage_url", url);
            if (string.IsNullOrEmpty(info.Thumbnail) && !string.IsNullOrEmpty(info.Id))
            {
                info.Thumbnail = "https://i.ytimg.com/vi/" + info.Id + "/hqdefault.jpg";
            }

            object rawFormatsObj;
            IList rawFormats = root.TryGetValue("formats", out rawFormatsObj) ? (rawFormatsObj as IList) : null;
            info.Resolutions = BuildResolutionOptions(rawFormats, info.Duration);
            return info;
        }

        public static async Task<YoutubeDownloadResult> DownloadAsync(
            YoutubeDownloadRequest req,
            Action<Dictionary<string, object>> onProgress,
            CancellationToken ct)
        {
            if (req == null) throw new ArgumentNullException("req");
            string url = NormalizeYoutubeUrl(req.Url);
            if (string.IsNullOrEmpty(url))
            {
                throw new ArgumentException("올바른 YouTube 링크가 아닙니다.");
            }

            string format = string.Equals(req.Format, "mp3", StringComparison.OrdinalIgnoreCase) ? "mp3" : "mp4";
            string saveDir = string.IsNullOrWhiteSpace(req.SaveDir) ? GetDefaultSaveDir() : req.SaveDir.Trim();
            Directory.CreateDirectory(saveDir);

            await EnsureEngineReadyAsync(true, delegate(string stage, int pct, string msg)
            {
                if (onProgress != null)
                {
                    onProgress(new Dictionary<string, object>
                    {
                        { "phase", "engine" },
                        { "stage", stage },
                        { "percent", Math.Max(0, Math.Min(100, pct)) },
                        { "message", msg }
                    });
                }
            }, ct).ConfigureAwait(false);

            ct.ThrowIfCancellationRequested();

            string ffmpegDir = FindWorkingFfmpegDir();
            if (string.IsNullOrEmpty(ffmpegDir))
            {
                throw new InvalidOperationException("FFmpeg 엔진을 초기화하지 못했습니다.");
            }

            string qjsPath = GetQjsPath();
            string outTemplate = Path.Combine(saveDir, "%(title)s.%(ext)s");

            StringBuilder args = new StringBuilder();
            args.Append("--no-playlist --newline --no-colors --no-simulate --windows-filenames --trim-filenames 140 --force-overwrites --encoding utf-8 ");
            args.AppendFormat(CultureInfo.InvariantCulture, "--ffmpeg-location \"{0}\" ", ffmpegDir);
            args.AppendFormat(CultureInfo.InvariantCulture, "--js-runtimes \"{0}\" ", "quickjs:" + qjsPath);

            if (format == "mp3")
            {
                int kbps = req.AudioBitrate > 0 ? req.AudioBitrate : 320;
                args.AppendFormat(
                    CultureInfo.InvariantCulture,
                    "-x --audio-format mp3 --audio-quality {0}K --embed-thumbnail --add-metadata ",
                    kbps
                );
            }
            else
            {
                if (req.MaxHeight > 0)
                {
                    string sortRes = req.ShortSide > 0
                        ? string.Format(CultureInfo.InvariantCulture, "res:{0},fps,vcodec:h264,acodec:m4a", req.ShortSide)
                        : string.Format(CultureInfo.InvariantCulture, "res:{0},fps,vcodec:h264,acodec:m4a", req.MaxHeight);
                    args.AppendFormat(
                        CultureInfo.InvariantCulture,
                        "-f \"bestvideo[height<={0}]+bestaudio/best[height<={0}]/best\" -S \"{1}\" ",
                        req.MaxHeight,
                        sortRes
                    );
                }
                else
                {
                    args.Append("-f \"bestvideo+bestaudio/best\" -S \"res,fps,vcodec:h264,acodec:m4a\" ");
                }
                args.Append("--merge-output-format mp4 --remux-video mp4 --add-metadata ");
            }

            args.Append("--progress-template \"download:AETHER_PROG|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s\" ");
            args.Append("--progress-template \"postprocess:AETHER_POST|%(progress.status)s|%(progress.postprocessor)s\" ");
            args.Append("--print \"after_move:AETHER_FILE|%(filepath)s\" ");
            args.AppendFormat(CultureInfo.InvariantCulture, "-o \"{0}\" \"{1}\"", outTemplate, url);

            if (onProgress != null)
            {
                onProgress(new Dictionary<string, object>
                {
                    { "phase", "download" },
                    { "percent", 0 },
                    { "speed", "" },
                    { "eta", "" },
                    { "message", format == "mp3" ? "오디오 스트림 다운로드 시작..." : "영상 및 오디오 스트림 다운로드 시작..." }
                });
            }

            string finalFilePath = null;
            StringBuilder errBuf = new StringBuilder();
            long lastEmitTick = 0;
            object sync = new object();

            ProcessStartInfo psi = CreateUtf8ProcessStartInfo(GetYtdlpPath(), args.ToString());
            int exitCode = await RunStreamingProcessAsync(
                psi,
                ct,
                delegate(string line)
                {
                    if (string.IsNullOrWhiteSpace(line)) return;
                    if (line.StartsWith("AETHER_FILE|", StringComparison.Ordinal))
                    {
                        string path = line.Substring("AETHER_FILE|".Length).Trim().Trim('"');
                        if (!string.IsNullOrEmpty(path)) finalFilePath = path;
                        return;
                    }
                    if (line.StartsWith("AETHER_POST|", StringComparison.Ordinal))
                    {
                        string[] parts = line.Split('|');
                        string postName = parts.Length >= 3 ? parts[2].Trim() : string.Empty;
                        string msg = format == "mp3"
                            ? "MP3 변환 및 앨범 커버 삽입 중..."
                            : "고화질 영상 · 오디오 MP4 병합 중...";
                        if (postName.IndexOf("Metadata", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            msg = "미디어 메타데이터 기록 중...";
                        }
                        if (onProgress != null)
                        {
                            onProgress(new Dictionary<string, object>
                            {
                                { "phase", "postprocess" },
                                { "percent", 99 },
                                { "speed", "" },
                                { "eta", "" },
                                { "message", msg }
                            });
                        }
                        return;
                    }
                    if (line.StartsWith("AETHER_PROG|", StringComparison.Ordinal))
                    {
                        long nowTick = Environment.TickCount & 0x7FFFFFFF;
                        string[] parts = line.Split('|');
                        double pct = ParsePercentString(parts.Length > 1 ? parts[1] : string.Empty);
                        string speed = parts.Length > 2 ? CleanCliField(parts[2]) : string.Empty;
                        string eta = parts.Length > 3 ? CleanCliField(parts[3]) : string.Empty;
                        long dlBytes = ParseLongString(parts.Length > 4 ? parts[4] : string.Empty);
                        long totBytes = ParseLongString(parts.Length > 5 ? parts[5] : string.Empty);
                        if (totBytes <= 0) totBytes = ParseLongString(parts.Length > 6 ? parts[6] : string.Empty);

                        bool shouldEmit = false;
                        lock (sync)
                        {
                            if (pct >= 99.5 || Math.Abs(nowTick - lastEmitTick) >= 120)
                            {
                                lastEmitTick = nowTick;
                                shouldEmit = true;
                            }
                        }

                        if (shouldEmit && onProgress != null)
                        {
                            string sizeText = dlBytes > 0
                                ? (totBytes > 0
                                    ? FormatBytes(dlBytes) + " / " + FormatBytes(totBytes)
                                    : FormatBytes(dlBytes))
                                : string.Empty;
                            onProgress(new Dictionary<string, object>
                            {
                                { "phase", "download" },
                                { "percent", Math.Max(0, Math.Min(100, Math.Round(pct, 1))) },
                                { "speed", speed },
                                { "eta", eta },
                                { "sizeText", sizeText },
                                { "message", format == "mp3" ? "MP3 추출 스트림 다운로드 중..." : "다운로드 진행 중..." }
                            });
                        }
                    }
                },
                delegate(string errLine)
                {
                    if (!string.IsNullOrWhiteSpace(errLine))
                    {
                        lock (errBuf)
                        {
                            if (errBuf.Length < 4000) errBuf.AppendLine(errLine);
                        }
                    }
                }
            ).ConfigureAwait(false);

            if (ct.IsCancellationRequested)
            {
                throw new OperationCanceledException(ct);
            }

            if (exitCode != 0)
            {
                string detail = ExtractCleanYtdlpError(errBuf.ToString());
                throw new InvalidOperationException(string.IsNullOrEmpty(detail) ? "다운로드 중 오류가 발생했습니다 (Code " + exitCode + ")." : detail);
            }

            if (string.IsNullOrEmpty(finalFilePath) || !File.Exists(finalFilePath))
            {
                finalFilePath = FindMostRecentOutputFile(saveDir, format == "mp3" ? ".mp3" : ".mp4");
            }

            if (string.IsNullOrEmpty(finalFilePath) || !File.Exists(finalFilePath))
            {
                throw new FileNotFoundException("다운로드는 완료되었으나 결과 파일을 찾을 수 없습니다.");
            }

            FileInfo fi = new FileInfo(finalFilePath);
            if (fi.Length <= 0)
            {
                throw new InvalidOperationException("다운로드된 파일 크기가 0바이트입니다.");
            }

            YoutubeDownloadResult res = new YoutubeDownloadResult();
            res.FilePath = Path.GetFullPath(finalFilePath);
            res.FileName = Path.GetFileName(finalFilePath);
            res.Format = format;
            res.FileSize = fi.Length;
            res.AutoPlay = req.AutoPlay;
            return res;
        }

        private static string FindMostRecentOutputFile(string dir, string expectedExt)
        {
            try
            {
                DirectoryInfo di = new DirectoryInfo(dir);
                if (!di.Exists) return null;
                FileInfo[] files = di.GetFiles("*" + expectedExt);
                FileInfo newest = null;
                DateTime cutoff = DateTime.UtcNow.AddMinutes(-10);
                for (int i = 0; i < files.Length; i++)
                {
                    if (files[i].LastWriteTimeUtc < cutoff) continue;
                    if (newest == null || files[i].LastWriteTimeUtc > newest.LastWriteTimeUtc)
                    {
                        newest = files[i];
                    }
                }
                return newest != null ? newest.FullName : null;
            }
            catch
            {
                return null;
            }
        }

        private static ProcessStartInfo CreateUtf8ProcessStartInfo(string fileName, string arguments)
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = fileName;
            psi.Arguments = arguments;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.StandardOutputEncoding = Encoding.UTF8;
            psi.StandardErrorEncoding = Encoding.UTF8;
            psi.EnvironmentVariables["PYTHONUTF8"] = "1";
            psi.EnvironmentVariables["PYTHONIOENCODING"] = "utf-8";
            return psi;
        }

        private static Task<int> RunProcessCaptureAsync(ProcessStartInfo psi, CancellationToken ct, Action<string, string> onComplete)
        {
            return Task.Run(delegate
            {
                using (Process proc = new Process())
                {
                    proc.StartInfo = psi;
                    StringBuilder outSb = new StringBuilder();
                    StringBuilder errSb = new StringBuilder();
                    ManualResetEventSlim outDone = new ManualResetEventSlim(false);
                    ManualResetEventSlim errDone = new ManualResetEventSlim(false);

                    proc.OutputDataReceived += delegate(object s, DataReceivedEventArgs e)
                    {
                        if (e.Data == null) outDone.Set();
                        else outSb.AppendLine(e.Data);
                    };
                    proc.ErrorDataReceived += delegate(object s, DataReceivedEventArgs e)
                    {
                        if (e.Data == null) errDone.Set();
                        else errSb.AppendLine(e.Data);
                    };

                    proc.Start();
                    proc.BeginOutputReadLine();
                    proc.BeginErrorReadLine();

                    while (!proc.WaitForExit(150))
                    {
                        if (ct.IsCancellationRequested)
                        {
                            KillProcessTree(proc);
                            ct.ThrowIfCancellationRequested();
                        }
                    }

                    outDone.Wait(2000);
                    errDone.Wait(2000);
                    if (onComplete != null) onComplete(outSb.ToString(), errSb.ToString());
                    return proc.ExitCode;
                }
            }, ct);
        }

        private static Task<int> RunStreamingProcessAsync(
            ProcessStartInfo psi,
            CancellationToken ct,
            Action<string> onStdoutLine,
            Action<string> onStderrLine)
        {
            return Task.Run(delegate
            {
                using (Process proc = new Process())
                {
                    proc.StartInfo = psi;
                    ManualResetEventSlim outDone = new ManualResetEventSlim(false);
                    ManualResetEventSlim errDone = new ManualResetEventSlim(false);

                    proc.OutputDataReceived += delegate(object s, DataReceivedEventArgs e)
                    {
                        if (e.Data == null) outDone.Set();
                        else if (onStdoutLine != null) onStdoutLine(e.Data);
                    };
                    proc.ErrorDataReceived += delegate(object s, DataReceivedEventArgs e)
                    {
                        if (e.Data == null) errDone.Set();
                        else if (onStderrLine != null) onStderrLine(e.Data);
                    };

                    proc.Start();
                    proc.BeginOutputReadLine();
                    proc.BeginErrorReadLine();

                    while (!proc.WaitForExit(150))
                    {
                        if (ct.IsCancellationRequested)
                        {
                            KillProcessTree(proc);
                            ct.ThrowIfCancellationRequested();
                        }
                    }

                    outDone.Wait(2000);
                    errDone.Wait(2000);
                    return proc.ExitCode;
                }
            }, ct);
        }

        private static void KillProcessTree(Process proc)
        {
            try
            {
                if (proc == null || proc.HasExited) return;
                ProcessStartInfo tk = new ProcessStartInfo("taskkill", "/PID " + proc.Id + " /T /F");
                tk.UseShellExecute = false;
                tk.CreateNoWindow = true;
                using (Process p = Process.Start(tk))
                {
                    if (p != null) p.WaitForExit(3000);
                }
            }
            catch { }

            try
            {
                if (proc != null && !proc.HasExited) proc.Kill();
            }
            catch { }
        }

        private static string ExtractCleanYtdlpError(string stderr)
        {
            if (string.IsNullOrWhiteSpace(stderr)) return string.Empty;
            string[] lines = stderr.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            for (int i = lines.Length - 1; i >= 0; i--)
            {
                string l = lines[i].Trim();
                if (l.StartsWith("ERROR:", StringComparison.OrdinalIgnoreCase))
                {
                    return l.Substring("ERROR:".Length).Trim();
                }
            }
            return lines.Length > 0 ? lines[lines.Length - 1].Trim() : string.Empty;
        }

        private static double ParsePercentString(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return 0;
            string s = raw.Trim().TrimEnd('%').Trim();
            double val;
            if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out val))
            {
                return val;
            }
            return 0;
        }

        private static long ParseLongString(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return 0;
            string s = raw.Trim();
            if (string.Equals(s, "NA", StringComparison.OrdinalIgnoreCase) || s == "~") return 0;
            long val;
            if (long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out val)) return val;
            double d;
            if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out d)) return (long)d;
            return 0;
        }

        private static string CleanCliField(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            string s = raw.Trim();
            if (string.Equals(s, "NA", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(s, "Unknown", StringComparison.OrdinalIgnoreCase) ||
                s == "~")
            {
                return string.Empty;
            }
            return Regex.Replace(s, "\\s+", " ");
        }

        private static string FormatBytes(long bytes)
        {
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1024 * 1024) return string.Format(CultureInfo.InvariantCulture, "{0:0.0} KB", bytes / 1024.0);
            if (bytes < 1024L * 1024 * 1024) return string.Format(CultureInfo.InvariantCulture, "{0:0.1} MB", bytes / (1024.0 * 1024.0));
            return string.Format(CultureInfo.InvariantCulture, "{0:0.2} GB", bytes / (1024.0 * 1024.0 * 1024.0));
        }

        private static void EnableTls12()
        {
            try
            {
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12 | (SecurityProtocolType)3072;
            }
            catch
            {
                try { ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12; } catch { }
            }
        }

        private static string GetDictStr(Dictionary<string, object> dict, string key, string fallback)
        {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null)
            {
                return Convert.ToString(val, CultureInfo.InvariantCulture);
            }
            return fallback;
        }

        private static bool GetDictBool(Dictionary<string, object> dict, string key, bool fallback)
        {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToBoolean(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }

        private static int GetDictInt(Dictionary<string, object> dict, string key, int fallback)
        {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToInt32(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }

        private static long GetDictLong(Dictionary<string, object> dict, string key, long fallback)
        {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToInt64(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }

        private static double GetDictDouble(Dictionary<string, object> dict, string key, double fallback)
        {
            object val;
            if (dict != null && dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToDouble(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }
    }
}
