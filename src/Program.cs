using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;

namespace AetherPlayer
{
    internal static class Program
    {
        internal const string SingleInstanceMutexName = "AETHER_PLAYER_SINGLE_INSTANCE_V1";
        internal const string SingleInstancePipeName = "AETHER_PLAYER_PIPE_V1";

        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        private static extern bool SetProcessDpiAwarenessContext(IntPtr value);

        [STAThread]
        private static int Main(string[] args)
        {
            EnablePerMonitorDpi();

            string selfTestOutPath = null;
            string updaterTestOutPath = null;
            string setupExePath = null;
            bool runSelfTest = false;
            bool runUpdaterTest = false;
            bool devMode = false;
            List<string> initialFiles = new List<string>();

            if (args != null)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string arg = args[i];
                    if (string.IsNullOrEmpty(arg)) continue;

                    if (string.Equals(arg, "--self-test", StringComparison.OrdinalIgnoreCase))
                    {
                        runSelfTest = true;
                    }
                    else if (arg.StartsWith("--self-test=", StringComparison.OrdinalIgnoreCase))
                    {
                        runSelfTest = true;
                        selfTestOutPath = arg.Substring("--self-test=".Length).Trim('"');
                    }
                    else if (arg.StartsWith("--self-test-updater=", StringComparison.OrdinalIgnoreCase))
                    {
                        runUpdaterTest = true;
                        updaterTestOutPath = arg.Substring("--self-test-updater=".Length).Trim('"');
                    }
                    else if (arg.StartsWith("--setup-exe=", StringComparison.OrdinalIgnoreCase))
                    {
                        setupExePath = arg.Substring("--setup-exe=".Length).Trim('"');
                    }
                    else if (string.Equals(arg, "--dev", StringComparison.OrdinalIgnoreCase))
                    {
                        devMode = true;
                    }
                    else if (File.Exists(arg))
                    {
                        initialFiles.Add(Path.GetFullPath(arg));
                    }
                }
            }

            if (runSelfTest)
            {
                return RunSelfTest(selfTestOutPath);
            }

            if (runUpdaterTest)
            {
                return RunUpdaterSelfTest(updaterTestOutPath, setupExePath);
            }

            bool createdNew;
            using (Mutex mutex = new Mutex(true, SingleInstanceMutexName, out createdNew))
            {
                if (!createdNew)
                {
                    ForwardToRunningInstance(initialFiles);
                    return 0;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainForm(initialFiles, devMode));
                return 0;
            }
        }

        private static void EnablePerMonitorDpi()
        {
            try
            {
                if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return;
            }
            catch { }
            try { SetProcessDPIAware(); } catch { }
        }

        private static void ForwardToRunningInstance(List<string> files)
        {
            try
            {
                using (NamedPipeClientStream pipe = new NamedPipeClientStream(".", SingleInstancePipeName, PipeDirection.Out))
                {
                    pipe.Connect(1500);
                    using (StreamWriter writer = new StreamWriter(pipe, new UTF8Encoding(false)))
                    {
                        if (files.Count == 0)
                        {
                            writer.WriteLine("__ACTIVATE__");
                        }
                        else
                        {
                            for (int i = 0; i < files.Count; i++)
                            {
                                writer.WriteLine(files[i]);
                            }
                        }
                        writer.Flush();
                    }
                }
            }
            catch { }
        }

        private static void VerifyStreamCase(MediaServer server, string ext, string expectedMime, StringBuilder report)
        {
            string tempFile = Path.Combine(Path.GetTempPath(), "aether_selftest_" + Guid.NewGuid().ToString("N") + ext);
            try
            {
                byte[] samplePayload = Encoding.ASCII.GetBytes("AETHER_STREAM_OK_0123456789ABCDEF");
                File.WriteAllBytes(tempFile, samplePayload);

                string mediaUrl = server.RegisterFile(tempFile);
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(mediaUrl);
                req.Method = "GET";
                req.AddRange(0, 15);
                req.Timeout = 5000;

                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    if (resp.StatusCode != HttpStatusCode.PartialContent)
                    {
                        throw new InvalidOperationException("Expected 206 Partial Content for " + ext);
                    }
                    string cors = resp.Headers["Access-Control-Allow-Origin"];
                    string contentRange = resp.Headers["Content-Range"];
                    string contentType = resp.ContentType;
                    if (cors != "*") throw new InvalidOperationException("Missing CORS header for " + ext);
                    if (!string.Equals(contentType, expectedMime, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException("Unexpected Content-Type for " + ext + ": " + contentType);
                    }
                    if (string.IsNullOrEmpty(contentRange) || !contentRange.StartsWith("bytes 0-15/", StringComparison.Ordinal))
                    {
                        throw new InvalidOperationException("Invalid Content-Range for " + ext);
                    }

                    byte[] readBuf = new byte[16];
                    using (Stream s = resp.GetResponseStream())
                    {
                        int total = 0;
                        while (total < 16)
                        {
                            int n = s.Read(readBuf, total, 16 - total);
                            if (n <= 0) break;
                            total += n;
                        }
                        if (Encoding.ASCII.GetString(readBuf, 0, total) != "AETHER_STREAM_OK")
                        {
                            throw new InvalidOperationException("Unexpected slice payload for " + ext);
                        }
                    }

                    report.AppendLine(string.Format("Stream[{0}]=206|CORS=*|Type={1}", ext, contentType));
                }
            }
            finally
            {
                if (File.Exists(tempFile))
                {
                    try { File.Delete(tempFile); } catch { }
                }
            }
        }

        private static int RunSelfTest(string outPath)
        {
            StringBuilder report = new StringBuilder();
            bool ok = true;

            try
            {
                string wvVersion = CoreWebView2Environment.GetAvailableBrowserVersionString();
                if (string.IsNullOrWhiteSpace(wvVersion)) throw new InvalidOperationException("WebView2 Runtime not found.");
                report.AppendLine("WebView2Runtime=" + wvVersion);
                report.AppendLine("AppVersion=" + AutoUpdater.CurrentVersion);

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string uiIndex = Path.Combine(baseDir, "ui", "index.html");
                if (!File.Exists(uiIndex)) throw new FileNotFoundException("Missing ui/index.html", uiIndex);
                report.AppendLine("UiEntry=" + uiIndex);

                using (MediaServer server = new MediaServer())
                {
                    VerifyStreamCase(server, ".mp4", "video/mp4", report);
                    VerifyStreamCase(server, ".mkv", "video/webm", report);
                    VerifyStreamCase(server, ".webm.part", "video/webm", report);
                    VerifyStreamCase(server, ".mp4.part", "video/mp4", report);
                }

                Rectangle testWork = new Rectangle(0, 0, 1920, 1040);
                double ratio169 = 16.0 / 9.0;
                MainForm.RECT shrink169 = new MainForm.RECT { Left = 100, Top = 100, Right = 320, Bottom = 350 };
                MainForm.RECT out169 = MainForm.AdjustRectForAspect(shrink169, MainForm.WMSZ_BOTTOMRIGHT, ratio169, testWork, MainForm.PipFrameExtraX, MainForm.PipFrameExtraY);
                double got169 = (double)((out169.Right - out169.Left) - MainForm.PipFrameExtraX) / Math.Max(1, (out169.Bottom - out169.Top) - MainForm.PipFrameExtraY);
                if (Math.Abs(got169 - ratio169) > 0.03) throw new InvalidOperationException("16:9 PIP aspect shrink mismatch: " + got169);

                double ratio916 = 9.0 / 16.0;
                MainForm.RECT shrink916Corner = new MainForm.RECT { Left = 200, Top = 200, Right = 370, Bottom = 520 };
                MainForm.RECT out916Corner = MainForm.AdjustRectForAspect(shrink916Corner, MainForm.WMSZ_BOTTOMRIGHT, ratio916, testWork, MainForm.PipFrameExtraX, MainForm.PipFrameExtraY);
                int w916Corner = out916Corner.Right - out916Corner.Left;
                double got916Corner = (double)(w916Corner - MainForm.PipFrameExtraX) / Math.Max(1, (out916Corner.Bottom - out916Corner.Top) - MainForm.PipFrameExtraY);
                if (Math.Abs(got916Corner - ratio916) > 0.03 || w916Corner >= 240) throw new InvalidOperationException("9:16 corner shrink failed: w=" + w916Corner + " r=" + got916Corner);

                MainForm.RECT shrink916Left = new MainForm.RECT { Left = 200, Top = 200, Right = 380, Bottom = 450 };
                MainForm.RECT out916Left = MainForm.AdjustRectForAspect(shrink916Left, MainForm.WMSZ_LEFT, ratio916, testWork, MainForm.PipFrameExtraX, MainForm.PipFrameExtraY);
                int w916Left = out916Left.Right - out916Left.Left;
                double got916Left = (double)(w916Left - MainForm.PipFrameExtraX) / Math.Max(1, (out916Left.Bottom - out916Left.Top) - MainForm.PipFrameExtraY);
                if (Math.Abs(got916Left - ratio916) > 0.03 || w916Left >= 240) throw new InvalidOperationException("9:16 left shrink failed: w=" + w916Left + " r=" + got916Left);

                MainForm.RECT shrink916Top = new MainForm.RECT { Left = 200, Top = 200, Right = 400, Bottom = 500 };
                MainForm.RECT out916Top = MainForm.AdjustRectForAspect(shrink916Top, MainForm.WMSZ_TOP, ratio916, testWork, MainForm.PipFrameExtraX, MainForm.PipFrameExtraY);
                int w916Top = out916Top.Right - out916Top.Left;
                double got916Top = (double)(w916Top - MainForm.PipFrameExtraX) / Math.Max(1, (out916Top.Bottom - out916Top.Top) - MainForm.PipFrameExtraY);
                if (Math.Abs(got916Top - ratio916) > 0.03 || w916Top >= 240) throw new InvalidOperationException("9:16 top shrink failed: w=" + w916Top + " r=" + got916Top);

                Rectangle switchRect = MainForm.ComputeAspectRectFromRect(new Rectangle(1000, 500, 470, 272), testWork, ratio916);
                double gotSwitch = (double)(switchRect.Width - MainForm.PipFrameExtraX) / Math.Max(1, switchRect.Height - MainForm.PipFrameExtraY);
                if (Math.Abs(gotSwitch - ratio916) > 0.03) throw new InvalidOperationException("Landscape->Portrait PIP aspect switch failed: " + gotSwitch);
                report.AppendLine("PipAspectMath=PASS");

                HashSet<string> regExts = new HashSet<string>(FileAssociation.GetRegisteredExtensions(), StringComparer.OrdinalIgnoreCase);
                string[] requiredExts = new[] { ".mp4", ".webm", ".mkv", ".mp3", ".part" };
                for (int i = 0; i < requiredExts.Length; i++)
                {
                    if (!regExts.Contains(requiredExts[i])) throw new InvalidOperationException("Missing registered ext: " + requiredExts[i]);
                }
                report.AppendLine("AssocExts=PASS");

                if (AutoUpdater.CurrentVersion != AppConfig.Version) throw new InvalidOperationException("Version mismatch with AppConfig");
                UpdateConfig defCfg = new UpdateConfig();
                if (!string.Equals(defCfg.SourceType, AppConfig.UpdateSourceType, StringComparison.OrdinalIgnoreCase) && AppConfig.UpdateSourceType == "feed")
                {
                    throw new InvalidOperationException("UpdateConfig SourceType mismatch with AppConfig");
                }
                report.AppendLine("AppConfigCheck=PASS");

                report.AppendLine("PayloadMatch=true");
                report.AppendLine("SELF_TEST=PASS");
            }
            catch (Exception ex)
            {
                ok = false;
                report.AppendLine("SELF_TEST=FAIL");
                report.AppendLine("ERROR=" + ex.ToString());
            }

            if (!string.IsNullOrEmpty(outPath))
            {
                try { File.WriteAllText(outPath, report.ToString(), Encoding.UTF8); } catch { }
            }

            return ok ? 0 : 1;
        }

        private static int RunUpdaterSelfTest(string outPath, string setupExePath)
        {
            StringBuilder report = new StringBuilder();
            bool ok = true;
            TcpListener listener = null;
            string tempUpgradeDir = Path.Combine(Path.GetTempPath(), "aether_upgrade_test_" + Guid.NewGuid().ToString("N"));
            string downloadedSetup = null;

            try
            {
                if (AutoUpdater.CompareVersions("2.1.0", "2.10.0") >= 0) throw new InvalidOperationException("SemVer compare failed (2.1.0 < 2.10.0)");
                if (AutoUpdater.CompareVersions("v2.1.0", "2.1.0") != 0) throw new InvalidOperationException("SemVer equality failed");
                if (AutoUpdater.NormalizeGithubRepo("https://github.com/foo/bar.git") != "foo/bar") throw new InvalidOperationException("NormalizeGithubRepo failed");
                report.AppendLine("SemVerAndRepo=PASS");

                if (string.IsNullOrEmpty(setupExePath) || !File.Exists(setupExePath))
                {
                    throw new FileNotFoundException("Missing setup exe for updater self-test", setupExePath);
                }

                string sha = AutoUpdater.ComputeSha256(setupExePath);
                byte[] setupBytes = File.ReadAllBytes(setupExePath);

                listener = new TcpListener(IPAddress.Loopback, 0);
                listener.Start();
                int port = ((IPEndPoint)listener.LocalEndpoint).Port;
                string feedUrl = "http://127.0.0.1:" + port + "/latest.json";
                string dlUrl = "http://127.0.0.1:" + port + "/setup.exe";

                string manifestJson = "{\"version\":\"9.9.9\",\"notes\":\"Test release\",\"downloadUrl\":\"" + dlUrl + "\",\"sha256\":\"" + sha + "\"}";
                byte[] manifestBytes = Encoding.UTF8.GetBytes(manifestJson);

                bool running = true;
                Task.Run(delegate
                {
                    while (running)
                    {
                        try
                        {
                            using (TcpClient c = listener.AcceptTcpClient())
                            using (NetworkStream ns = c.GetStream())
                            {
                                byte[] buf = new byte[4096];
                                int read = ns.Read(buf, 0, buf.Length);
                                string reqStr = Encoding.ASCII.GetString(buf, 0, Math.Max(0, read));
                                bool isExe = reqStr.IndexOf("GET /setup.exe", StringComparison.OrdinalIgnoreCase) >= 0;
                                byte[] body = isExe ? setupBytes : manifestBytes;
                                string ctype = isExe ? "application/octet-stream" : "application/json; charset=utf-8";
                                string hdr = "HTTP/1.1 200 OK\r\nContent-Type: " + ctype + "\r\nContent-Length: " + body.Length + "\r\nConnection: close\r\n\r\n";
                                byte[] hdrBytes = Encoding.ASCII.GetBytes(hdr);
                                ns.Write(hdrBytes, 0, hdrBytes.Length);
                                ns.Write(body, 0, body.Length);
                            }
                        }
                        catch
                        {
                            if (!running) break;
                        }
                    }
                });

                UpdateConfig cfg = new UpdateConfig();
                cfg.SourceType = "feed";
                cfg.FeedUrl = feedUrl;

                UpdateCheckResult checkRes = AutoUpdater.CheckForUpdatesAsync(cfg).GetAwaiter().GetResult();
                if (!checkRes.Success || !checkRes.UpdateAvailable || checkRes.LatestVersion != "9.9.9")
                {
                    throw new InvalidOperationException("CheckForUpdatesAsync failed: " + (checkRes.Error ?? checkRes.LatestVersion));
                }
                report.AppendLine("FeedCheck=PASS|Latest=" + checkRes.LatestVersion);

                int maxPct = 0;
                downloadedSetup = AutoUpdater.DownloadUpdateAsync(checkRes, delegate(int pct, long rec, long tot)
                {
                    if (pct > maxPct) maxPct = pct;
                }).GetAwaiter().GetResult();

                running = false;
                try { listener.Stop(); } catch { }

                if (maxPct != 100 || !File.Exists(downloadedSetup))
                {
                    throw new InvalidOperationException("DownloadUpdateAsync incomplete");
                }
                report.AppendLine("DownloadAndSha256=PASS|MaxPct=" + maxPct);

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = downloadedSetup;
                psi.Arguments = "--silent --no-reg --dir=\"" + tempUpgradeDir + "\"";
                psi.UseShellExecute = false;
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(20000);
                    if (p.ExitCode != 0) throw new InvalidOperationException("Silent installer exited with " + p.ExitCode);
                }
                report.AppendLine("SilentInstall=PASS");

                string upgradedExe = Path.Combine(tempUpgradeDir, "AETHER Player.exe");
                string upgradedSelfOut = Path.Combine(tempUpgradeDir, "_check.txt");
                ProcessStartInfo psi2 = new ProcessStartInfo();
                psi2.FileName = upgradedExe;
                psi2.Arguments = "--self-test=\"" + upgradedSelfOut + "\"";
                psi2.UseShellExecute = false;
                using (Process p2 = Process.Start(psi2))
                {
                    p2.WaitForExit(10000);
                    if (p2.ExitCode != 0) throw new InvalidOperationException("Upgraded exe self-test failed with " + p2.ExitCode);
                }
                report.AppendLine("UpgradedExeSelfTest=PASS");
                report.AppendLine("UPDATER_TEST=PASS");
            }
            catch (Exception ex)
            {
                ok = false;
                report.AppendLine("UPDATER_TEST=FAIL");
                report.AppendLine("ERROR=" + ex.ToString());
            }
            finally
            {
                if (listener != null) { try { listener.Stop(); } catch { } }
                if (!string.IsNullOrEmpty(downloadedSetup) && File.Exists(downloadedSetup))
                {
                    try { File.Delete(downloadedSetup); } catch { }
                }
                if (Directory.Exists(tempUpgradeDir))
                {
                    try { Directory.Delete(tempUpgradeDir, true); } catch { }
                }
            }

            if (!string.IsNullOrEmpty(outPath))
            {
                try { File.WriteAllText(outPath, report.ToString(), Encoding.UTF8); } catch { }
            }
            return ok ? 0 : 1;
        }
    }
}
