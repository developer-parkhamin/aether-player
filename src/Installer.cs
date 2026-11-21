using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Microsoft.Win32;

namespace AetherPlayer
{
    internal static class InstallerEntry
    {
        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        private static extern bool SetProcessDpiAwarenessContext(IntPtr value);

        [STAThread]
        private static int Main(string[] args)
        {
            EnablePerMonitorDpi();

            string verifyPath = null;
            string testExtractDir = null;
            string silentDir = null;
            string silentLog = null;
            int waitPid = 0;
            bool silentMode = false;
            bool launchAfter = false;
            bool noReg = false;
            bool uninstallMode = false;

            if (args != null)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string a = args[i];
                    if (string.IsNullOrEmpty(a)) continue;

                    if (a.StartsWith("--verify-payload=", StringComparison.OrdinalIgnoreCase))
                    {
                        verifyPath = a.Substring("--verify-payload=".Length).Trim('"');
                    }
                    else if (a.StartsWith("--test-extract=", StringComparison.OrdinalIgnoreCase))
                    {
                        testExtractDir = a.Substring("--test-extract=".Length).Trim('"');
                    }
                    else if (string.Equals(a, "--silent", StringComparison.OrdinalIgnoreCase))
                    {
                        silentMode = true;
                    }
                    else if (a.StartsWith("--dir=", StringComparison.OrdinalIgnoreCase))
                    {
                        silentDir = a.Substring("--dir=".Length).Trim('"');
                    }
                    else if (a.StartsWith("--wait-pid=", StringComparison.OrdinalIgnoreCase))
                    {
                        int.TryParse(a.Substring("--wait-pid=".Length), out waitPid);
                    }
                    else if (string.Equals(a, "--launch", StringComparison.OrdinalIgnoreCase))
                    {
                        launchAfter = true;
                    }
                    else if (string.Equals(a, "--no-reg", StringComparison.OrdinalIgnoreCase))
                    {
                        noReg = true;
                    }
                    else if (a.StartsWith("--log=", StringComparison.OrdinalIgnoreCase))
                    {
                        silentLog = a.Substring("--log=".Length).Trim('"');
                    }
                    else if (string.Equals(a, "--uninstall", StringComparison.OrdinalIgnoreCase))
                    {
                        uninstallMode = true;
                    }
                }
            }

            if (verifyPath != null)
            {
                return VerifyPayload(verifyPath);
            }

            if (testExtractDir != null)
            {
                return TestExtractPayload(testExtractDir);
            }

            if (silentMode)
            {
                return RunSilentUpgrade(silentDir, waitPid, launchAfter, noReg, silentLog);
            }

            Application app = new Application();
            InstallerController controller = new InstallerController(app, uninstallMode);
            return controller.Run();
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

        internal static Stream OpenResource(string name)
        {
            return Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
        }

        private static int VerifyPayload(string outPath)
        {
            StringBuilder sb = new StringBuilder();
            bool ok = true;
            try
            {
                // 1. Verify embedded XAML loads cleanly and all named controls exist
                using (Stream xs = OpenResource("InstallerWindow.xaml"))
                {
                    if (xs == null) throw new InvalidOperationException("Missing embedded InstallerWindow.xaml");
                    Window win = (Window)XamlReader.Load(xs);
                    string[] names = new[]
                    {
                        "BrandIconImage", "TxtSidebarVersion",
                        "StepBadge0", "StepBadge1", "StepBadge2", "StepBadge3",
                        "StepNum0", "StepNum1", "StepNum2", "StepNum3",
                        "StepLabel0", "StepLabel1", "StepLabel2", "StepLabel3",
                        "DragHeader", "TxtHeaderSub", "BtnCloseX",
                        "PageWelcome", "TxtWelcomeTitle", "TxtWelcomeDesc", "TxtCheckOs", "TxtCheckWv2", "TxtCheckMode",
                        "PageOptions", "BtnPresetStandard", "BtnPresetCustom", "TxtPresetStandardTitle", "TxtPresetCustomTitle", "TxtInstallPath", "BtnBrowse", "TxtDiskSpace",
                        "ToggleDesktop", "ToggleStartMenu", "ToggleAssoc",
                        "PageProgress", "TxtProgressStatus", "TxtProgressPct", "ProgressTrack", "ProgressFill", "TxtInstallLog",
                        "PageFinish", "TxtFinishTitle", "TxtFinishPath", "AssocFinishCard", "TxtAssocFinishHint", "ToggleOpenDefaultApps", "ToggleLaunchAfter", "BtnOpenDefaultApps", "BtnOpenInstallDir",
                        "PageUninstall", "TxtUninstallPath", "ToggleRemoveUserData", "UninstallProgressFill", "TxtUninstallLog",
                        "BtnBack", "BtnCancel", "BtnNext"
                    };
                    for (int i = 0; i < names.Length; i++)
                    {
                        if (win.FindName(names[i]) == null)
                        {
                            throw new InvalidOperationException("Missing XAML element: " + names[i]);
                        }
                    }
                    win.Close();
                    sb.AppendLine("XAML_VERIFY=PASS");
                }

                // 2. Verify SetupBadge.png
                using (Stream bs = OpenResource("SetupBadge.png"))
                {
                    if (bs == null || bs.Length < 100) throw new InvalidOperationException("Missing embedded SetupBadge.png");
                }

                // 3. Verify embedded AetherPayload.zip
                using (Stream s = OpenResource("AetherPayload.zip"))
                {
                    if (s == null) throw new InvalidOperationException("Missing embedded AetherPayload.zip");
                    using (ZipArchive zip = new ZipArchive(s, ZipArchiveMode.Read))
                    {
                        HashSet<string> entries = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        foreach (ZipArchiveEntry entry in zip.Entries)
                        {
                            entries.Add(entry.FullName.Replace('\\', '/'));
                        }

                        string[] required = new[]
                        {
                            "AETHER Player.exe",
                            "Microsoft.Web.WebView2.Core.dll",
                            "Microsoft.Web.WebView2.WinForms.dll",
                            "WebView2Loader.dll",
                            "assets/aether.ico",
                            "ui/index.html"
                        };

                        for (int i = 0; i < required.Length; i++)
                        {
                            if (!entries.Contains(required[i]))
                            {
                                throw new FileNotFoundException("Missing entry in payload: " + required[i]);
                            }
                        }
                        sb.AppendLine("EntryCount=" + zip.Entries.Count);
                        sb.AppendLine("PAYLOAD_VERIFY=PASS");
                    }
                }
            }
            catch (Exception ex)
            {
                ok = false;
                sb.AppendLine("PAYLOAD_VERIFY=FAIL");
                sb.AppendLine("ERROR=" + ex.ToString());
            }

            if (!string.IsNullOrEmpty(outPath))
            {
                try { File.WriteAllText(outPath, sb.ToString(), Encoding.UTF8); } catch { }
            }
            return ok ? 0 : 1;
        }

        private static int TestExtractPayload(string targetDir)
        {
            try
            {
                ExtractPayloadToDirectory(targetDir, null);
                return 0;
            }
            catch
            {
                return 1;
            }
        }

        private static int RunSilentUpgrade(string targetDir, int waitPid, bool launchAfter, bool noReg, string logPath)
        {
            StringBuilder log = new StringBuilder();
            try
            {
                if (string.IsNullOrWhiteSpace(targetDir))
                {
                    targetDir = GetDefaultInstallDir();
                }
                string fullTarget = Path.GetFullPath(targetDir);
                log.AppendLine("TargetDir=" + fullTarget);

                StopRunningAppInstances(fullTarget, waitPid, delegate(string msg) { log.AppendLine(msg); });

                ExtractPayloadWithRetry(fullTarget, null, delegate(string msg) { log.AppendLine(msg); });

                string exePath = Path.Combine(fullTarget, "AETHER Player.exe");
                string iconPath = Path.Combine(fullTarget, "assets", "aether.ico");
                string uninstallerPath = Path.Combine(fullTarget, "Uninstall AETHER Player.exe");
                try
                {
                    File.Copy(Assembly.GetExecutingAssembly().Location, uninstallerPath, true);
                }
                catch { }

                if (!noReg)
                {
                    if (FileAssociation.IsRegistered(null))
                    {
                        FileAssociation.Register(exePath);
                    }
                    RegisterUninstallEntry(fullTarget, uninstallerPath, iconPath);
                }

                if (launchAfter && File.Exists(exePath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo(exePath);
                    psi.WorkingDirectory = fullTarget;
                    Process.Start(psi);
                }

                log.AppendLine("SILENT_UPGRADE=PASS");
                if (!string.IsNullOrEmpty(logPath)) File.WriteAllText(logPath, log.ToString(), Encoding.UTF8);
                return 0;
            }
            catch (Exception ex)
            {
                log.AppendLine("SILENT_UPGRADE=FAIL: " + ex.ToString());
                if (!string.IsNullOrEmpty(logPath))
                {
                    try { File.WriteAllText(logPath, log.ToString(), Encoding.UTF8); } catch { }
                }
                return 1;
            }
        }

        internal static string GetDefaultInstallDir()
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "AETHER Player"
            );
        }

        internal static void StopRunningAppInstances(string targetDir, int waitPid, Action<string> logger)
        {
            if (waitPid > 0)
            {
                if (logger != null) logger("기존 프로세스 종료 대기 중 (PID " + waitPid + ")...");
                try
                {
                    using (Process p = Process.GetProcessById(waitPid))
                    {
                        if (!p.HasExited)
                        {
                            p.WaitForExit(6000);
                        }
                    }
                }
                catch { }
            }

            string targetPrefix = string.Empty;
            if (!string.IsNullOrWhiteSpace(targetDir))
            {
                try
                {
                    string full = Path.GetFullPath(targetDir).TrimEnd(Path.DirectorySeparatorChar);
                    targetPrefix = full + Path.DirectorySeparatorChar;
                }
                catch { }
            }

            try
            {
                Process[] procs = Process.GetProcessesByName("AETHER Player");
                if (procs != null && procs.Length > 0)
                {
                    for (int i = 0; i < procs.Length; i++)
                    {
                        try
                        {
                            if (procs[i].HasExited) continue;
                            bool shouldStop = (waitPid > 0 && procs[i].Id == waitPid);
                            if (!shouldStop && !string.IsNullOrEmpty(targetPrefix))
                            {
                                try
                                {
                                    string procPath = procs[i].MainModule.FileName;
                                    if (!string.IsNullOrEmpty(procPath) && procPath.StartsWith(targetPrefix, StringComparison.OrdinalIgnoreCase))
                                    {
                                        shouldStop = true;
                                    }
                                }
                                catch { }
                            }
                            if (!shouldStop) continue;

                            if (logger != null) logger("실행 중인 대상 프로세스를 안전하게 종료합니다 (PID " + procs[i].Id + ")...");
                            procs[i].CloseMainWindow();
                            if (!procs[i].WaitForExit(1800) && !procs[i].HasExited)
                            {
                                procs[i].Kill();
                                procs[i].WaitForExit(3000);
                            }
                            Thread.Sleep(200);
                        }
                        catch { }
                        finally
                        {
                            try { procs[i].Dispose(); } catch { }
                        }
                    }
                }
            }
            catch { }
        }

        internal static void ExtractPayloadWithRetry(string targetDir, Action<int> onProgress, Action<string> logger)
        {
            Exception lastErr = null;
            for (int attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    ExtractPayloadToDirectory(targetDir, onProgress);
                    return;
                }
                catch (Exception ex)
                {
                    lastErr = ex;
                    if (logger != null) logger("파일 복사 재시도 (" + attempt + "/3): " + ex.Message);
                    Thread.Sleep(350);
                }
            }
            if (lastErr != null) throw lastErr;
        }

        internal static void ExtractPayloadToDirectory(string targetDir, Action<int> onProgress)
        {
            string fullTarget = Path.GetFullPath(targetDir);
            Directory.CreateDirectory(fullTarget);
            string fullTargetWithSep = fullTarget.EndsWith(Path.DirectorySeparatorChar.ToString())
                ? fullTarget
                : fullTarget + Path.DirectorySeparatorChar;

            using (Stream s = OpenResource("AetherPayload.zip"))
            {
                if (s == null) throw new InvalidOperationException("설치 패키지가 손상되었습니다.");
                using (ZipArchive zip = new ZipArchive(s, ZipArchiveMode.Read))
                {
                    int total = Math.Max(1, zip.Entries.Count);
                    int done = 0;
                    foreach (ZipArchiveEntry entry in zip.Entries)
                    {
                        string rel = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                        if (string.IsNullOrEmpty(rel) || rel.EndsWith(Path.DirectorySeparatorChar.ToString()))
                        {
                            done++;
                            continue;
                        }
                        string destPath = Path.GetFullPath(Path.Combine(fullTarget, rel));
                        if (!destPath.StartsWith(fullTargetWithSep, StringComparison.OrdinalIgnoreCase))
                        {
                            continue;
                        }
                        string parent = Path.GetDirectoryName(destPath);
                        if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
                        entry.ExtractToFile(destPath, true);
                        done++;
                        if (onProgress != null) onProgress((done * 100) / total);
                    }
                }
            }
        }

        internal static void RegisterUninstallEntry(string installDir, string uninstallerPath, string iconPath)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\AetherPlayer"))
                {
                    if (key == null) return;
                    key.SetValue("DisplayName", "AETHER Player");
                    key.SetValue("DisplayVersion", AppConfig.Version);
                    key.SetValue("Publisher", "AETHER Studio");
                    key.SetValue("DisplayIcon", iconPath);
                    key.SetValue("InstallLocation", installDir);
                    key.SetValue("UninstallString", "\"" + uninstallerPath + "\" --uninstall");
                    key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                    key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                }
            }
            catch { }
        }

        internal static void CreateShortcut(string lnkPath, string targetPath, string workDir, string iconPath, string desc, string arguments)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { lnkPath });
                Type scType = shortcut.GetType();
                scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
                scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workDir });
                scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconPath });
                scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { desc });
                if (!string.IsNullOrEmpty(arguments))
                {
                    scType.InvokeMember("Arguments", BindingFlags.SetProperty, null, shortcut, new object[] { arguments });
                }
                scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
            }
            catch { }
        }
    }

    internal sealed class InstallerController
    {
        private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
        private const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        private readonly Application _app;
        private readonly bool _uninstallMode;
        private Window _window;
        private int _step;
        private bool _isUpgrade;
        private bool _busy;

        // Controls
        private System.Windows.Controls.Image _brandImg;
        private Border[] _stepBadges;
        private TextBlock[] _stepNums;
        private TextBlock[] _stepLabels;
        private TextBlock _txtHeaderSub;
        private StackPanel _pageWelcome;
        private StackPanel _pageOptions;
        private StackPanel _pageProgress;
        private StackPanel _pageFinish;
        private StackPanel _pageUninstall;

        private TextBlock _txtWelcomeTitle;
        private TextBlock _txtCheckWv2;
        private TextBlock _txtCheckMode;
        private Button _btnPresetStandard;
        private Button _btnPresetCustom;
        private TextBlock _txtPresetStandardTitle;
        private TextBlock _txtPresetCustomTitle;
        private TextBox _txtInstallPath;
        private TextBlock _txtDiskSpace;
        private CheckBox _toggleDesktop;
        private CheckBox _toggleStartMenu;
        private CheckBox _toggleAssoc;

        private TextBlock _txtProgressStatus;
        private TextBlock _txtProgressPct;
        private Border _progressTrack;
        private Border _progressFill;
        private TextBlock _txtInstallLog;

        private TextBlock _txtFinishTitle;
        private TextBlock _txtFinishPath;
        private Border _assocFinishCard;
        private TextBlock _txtAssocFinishHint;
        private CheckBox _toggleOpenDefaultApps;
        private CheckBox _toggleLaunchAfter;
        private Button _btnOpenDefaultApps;

        private TextBlock _txtUninstallPath;
        private CheckBox _toggleRemoveUserData;
        private Border _uninstallProgressFill;
        private TextBlock _txtUninstallLog;

        private Button _btnBack;
        private Button _btnCancel;
        private Button _btnNext;

        public InstallerController(Application app, bool uninstallMode)
        {
            _app = app;
            _uninstallMode = uninstallMode;
        }

        public int Run()
        {
            using (Stream xs = InstallerEntry.OpenResource("InstallerWindow.xaml"))
            {
                _window = (Window)XamlReader.Load(xs);
            }

            BindElements();
            LoadBrandImage();
            ApplyDwmOnSourceInitialized();

            if (_uninstallMode)
            {
                SetupUninstallView();
            }
            else
            {
                SetupInstallView();
            }

            return _app.Run(_window);
        }

        private void BindElements()
        {
            _brandImg = (System.Windows.Controls.Image)_window.FindName("BrandIconImage");
            _stepBadges = new[]
            {
                (Border)_window.FindName("StepBadge0"),
                (Border)_window.FindName("StepBadge1"),
                (Border)_window.FindName("StepBadge2"),
                (Border)_window.FindName("StepBadge3")
            };
            _stepNums = new[]
            {
                (TextBlock)_window.FindName("StepNum0"),
                (TextBlock)_window.FindName("StepNum1"),
                (TextBlock)_window.FindName("StepNum2"),
                (TextBlock)_window.FindName("StepNum3")
            };
            _stepLabels = new[]
            {
                (TextBlock)_window.FindName("StepLabel0"),
                (TextBlock)_window.FindName("StepLabel1"),
                (TextBlock)_window.FindName("StepLabel2"),
                (TextBlock)_window.FindName("StepLabel3")
            };

            _txtHeaderSub = (TextBlock)_window.FindName("TxtHeaderSub");
            _pageWelcome = (StackPanel)_window.FindName("PageWelcome");
            _pageOptions = (StackPanel)_window.FindName("PageOptions");
            _pageProgress = (StackPanel)_window.FindName("PageProgress");
            _pageFinish = (StackPanel)_window.FindName("PageFinish");
            _pageUninstall = (StackPanel)_window.FindName("PageUninstall");

            _txtWelcomeTitle = (TextBlock)_window.FindName("TxtWelcomeTitle");
            _txtCheckWv2 = (TextBlock)_window.FindName("TxtCheckWv2");
            _txtCheckMode = (TextBlock)_window.FindName("TxtCheckMode");
            _btnPresetStandard = (Button)_window.FindName("BtnPresetStandard");
            _btnPresetCustom = (Button)_window.FindName("BtnPresetCustom");
            _txtPresetStandardTitle = (TextBlock)_window.FindName("TxtPresetStandardTitle");
            _txtPresetCustomTitle = (TextBlock)_window.FindName("TxtPresetCustomTitle");
            _txtInstallPath = (TextBox)_window.FindName("TxtInstallPath");
            _txtDiskSpace = (TextBlock)_window.FindName("TxtDiskSpace");
            _toggleDesktop = (CheckBox)_window.FindName("ToggleDesktop");
            _toggleStartMenu = (CheckBox)_window.FindName("ToggleStartMenu");
            _toggleAssoc = (CheckBox)_window.FindName("ToggleAssoc");

            _txtProgressStatus = (TextBlock)_window.FindName("TxtProgressStatus");
            _txtProgressPct = (TextBlock)_window.FindName("TxtProgressPct");
            _progressTrack = (Border)_window.FindName("ProgressTrack");
            _progressFill = (Border)_window.FindName("ProgressFill");
            _txtInstallLog = (TextBlock)_window.FindName("TxtInstallLog");

            _txtFinishTitle = (TextBlock)_window.FindName("TxtFinishTitle");
            _txtFinishPath = (TextBlock)_window.FindName("TxtFinishPath");
            _assocFinishCard = (Border)_window.FindName("AssocFinishCard");
            _txtAssocFinishHint = (TextBlock)_window.FindName("TxtAssocFinishHint");
            _toggleOpenDefaultApps = (CheckBox)_window.FindName("ToggleOpenDefaultApps");
            _toggleLaunchAfter = (CheckBox)_window.FindName("ToggleLaunchAfter");
            _btnOpenDefaultApps = (Button)_window.FindName("BtnOpenDefaultApps");

            _txtUninstallPath = (TextBlock)_window.FindName("TxtUninstallPath");
            _toggleRemoveUserData = (CheckBox)_window.FindName("ToggleRemoveUserData");
            _uninstallProgressFill = (Border)_window.FindName("UninstallProgressFill");
            _txtUninstallLog = (TextBlock)_window.FindName("TxtUninstallLog");

            _btnBack = (Button)_window.FindName("BtnBack");
            _btnCancel = (Button)_window.FindName("BtnCancel");
            _btnNext = (Button)_window.FindName("BtnNext");

            Grid dragHeader = (Grid)_window.FindName("DragHeader");
            dragHeader.MouseLeftButtonDown += delegate(object s, MouseButtonEventArgs e)
            {
                if (e.ButtonState == MouseButtonState.Pressed) _window.DragMove();
            };

            Button btnCloseX = (Button)_window.FindName("BtnCloseX");
            btnCloseX.Click += delegate { if (!_busy) _window.Close(); };
            _btnCancel.Click += delegate { if (!_busy) _window.Close(); };

            Button btnBrowse = (Button)_window.FindName("BtnBrowse");
            btnBrowse.Click += delegate { BrowseInstallFolder(); };

            _btnPresetStandard.Click += delegate
            {
                _toggleDesktop.IsChecked = true;
                _toggleStartMenu.IsChecked = true;
                _toggleAssoc.IsChecked = true;
                UpdatePresetCardStyles();
            };

            _btnPresetCustom.Click += delegate
            {
                _toggleDesktop.IsChecked = false;
                _toggleStartMenu.IsChecked = false;
                _toggleAssoc.IsChecked = false;
                UpdatePresetCardStyles();
            };

            RoutedEventHandler onToggleChanged = delegate { UpdatePresetCardStyles(); };
            _toggleDesktop.Checked += onToggleChanged;
            _toggleDesktop.Unchecked += onToggleChanged;
            _toggleStartMenu.Checked += onToggleChanged;
            _toggleStartMenu.Unchecked += onToggleChanged;
            _toggleAssoc.Checked += onToggleChanged;
            _toggleAssoc.Unchecked += onToggleChanged;

            _btnOpenDefaultApps.Click += delegate
            {
                try
                {
                    string dir = _txtInstallPath.Text.Trim();
                    string exePath = string.IsNullOrEmpty(dir) ? string.Empty : Path.Combine(dir, "AETHER Player.exe");
                    if (!string.IsNullOrEmpty(exePath) && File.Exists(exePath))
                    {
                        FileAssociation.Register(exePath);
                    }
                    FileAssociation.OpenWindowsDefaultAppsSettings();
                }
                catch { }
            };

            Button btnOpenDir = (Button)_window.FindName("BtnOpenInstallDir");
            btnOpenDir.Click += delegate
            {
                try
                {
                    string dir = _txtInstallPath.Text.Trim();
                    if (Directory.Exists(dir)) Process.Start("explorer.exe", dir);
                }
                catch { }
            };

            _txtInstallPath.TextChanged += delegate { RefreshInstallModeAndDisk(); };
        }

        private void LoadBrandImage()
        {
            try
            {
                using (Stream s = InstallerEntry.OpenResource("SetupBadge.png"))
                {
                    if (s == null) return;
                    BitmapImage bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.StreamSource = s;
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();
                    bmp.Freeze();
                    _brandImg.Source = bmp;
                }
            }
            catch { }
        }

        private void ApplyDwmOnSourceInitialized()
        {
            _window.SourceInitialized += delegate
            {
                try
                {
                    IntPtr hwnd = new WindowInteropHelper(_window).Handle;
                    int dark = 1;
                    DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ref dark, sizeof(int));
                    int round = 2;
                    DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, ref round, sizeof(int));
                }
                catch { }
            };
        }

        private void SetupInstallView()
        {
            string defaultDir = InstallerEntry.GetDefaultInstallDir();
            _txtInstallPath.Text = defaultDir;
            CheckWebView2Version();
            RefreshInstallModeAndDisk();
            UpdatePresetCardStyles();

            _btnBack.Click += delegate
            {
                if (!_busy && _step == 1) ShowStep(0);
            };
            _btnNext.Click += async delegate
            {
                if (_busy) return;
                if (_step == 0) ShowStep(1);
                else if (_step == 1) await ExecuteInstallAsync();
                else if (_step == 3) FinishAndClose();
            };

            ShowStep(0);
        }

        private void SetupUninstallView()
        {
            _window.Title = "AETHER Player 제거";
            _txtHeaderSub.Text = "UNINSTALL · AETHER PLAYER";
            _pageWelcome.Visibility = Visibility.Collapsed;
            _pageOptions.Visibility = Visibility.Collapsed;
            _pageProgress.Visibility = Visibility.Collapsed;
            _pageFinish.Visibility = Visibility.Collapsed;
            _pageUninstall.Visibility = Visibility.Visible;

            for (int i = 0; i < 4; i++)
            {
                _stepLabels[i].Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
            }
            _stepLabels[0].Text = "제거 대상 확인";
            _stepLabels[1].Text = "설정 및 연결 정리";
            _stepLabels[2].Text = "파일 삭제";
            _stepLabels[3].Text = "제거 완료";

            _txtUninstallPath.Text = "다음 위치에 설치된 AETHER Player를 제거합니다:\n" + AppDomain.CurrentDomain.BaseDirectory;
            _btnBack.Visibility = Visibility.Collapsed;
            _btnNext.Style = (Style)_window.FindResource("DangerBtn");
            _btnNext.Content = "지금 제거";
            _btnNext.Click += async delegate { await ExecuteUninstallAsync(); };
        }

        private void CheckWebView2Version()
        {
            string ver = FindWebView2RuntimeVersion();
            if (!string.IsNullOrEmpty(ver))
            {
                _txtCheckWv2.Text = "v" + ver + " 감지됨 ✓";
                _txtCheckWv2.Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153));
            }
            else
            {
                _txtCheckWv2.Text = "설치 필요 (Microsoft Edge WebView2)";
                _txtCheckWv2.Foreground = new SolidColorBrush(Color.FromRgb(251, 191, 36));
            }
        }

        private static string FindWebView2RuntimeVersion()
        {
            string[] paths = new[]
            {
                @"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
                @"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
            };

            for (int i = 0; i < paths.Length; i++)
            {
                try
                {
                    using (RegistryKey k = Registry.LocalMachine.OpenSubKey(paths[i], false))
                    {
                        if (k != null && k.GetValue("pv") != null) return k.GetValue("pv").ToString();
                    }
                }
                catch { }
                try
                {
                    using (RegistryKey k = Registry.CurrentUser.OpenSubKey(paths[i], false))
                    {
                        if (k != null && k.GetValue("pv") != null) return k.GetValue("pv").ToString();
                    }
                }
                catch { }
            }
            return string.Empty;
        }

        private void RefreshInstallModeAndDisk()
        {
            string dir = _txtInstallPath.Text.Trim();
            bool exists = !string.IsNullOrEmpty(dir) && File.Exists(Path.Combine(dir, "AETHER Player.exe"));
            _isUpgrade = exists;

            if (_isUpgrade)
            {
                _txtWelcomeTitle.Text = "AETHER Player v" + AppConfig.Version + " 업데이트";
                _txtCheckMode.Text = "기존 설치 감지됨 · 설정 유지 업데이트 ✓";
                _txtCheckMode.Foreground = new SolidColorBrush(Color.FromRgb(56, 189, 248));
            }
            else
            {
                _txtWelcomeTitle.Text = "AETHER Player v" + AppConfig.Version + " 설치";
                _txtCheckMode.Text = "신규 설치 준비 완료";
                _txtCheckMode.Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240));
            }

            try
            {
                string root = Path.GetPathRoot(string.IsNullOrEmpty(dir) ? InstallerEntry.GetDefaultInstallDir() : Path.GetFullPath(dir));
                DriveInfo drive = new DriveInfo(root);
                double freeGb = drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
                _txtDiskSpace.Text = string.Format(CultureInfo.InvariantCulture, "필요 ~2.5 MB · 여유 {0:0.0} GB", freeGb);
            }
            catch
            {
                _txtDiskSpace.Text = "필요 공간 ~2.5 MB";
            }
        }

        private void UpdatePresetCardStyles()
        {
            if (_btnPresetStandard == null || _btnPresetCustom == null) return;

            bool isStandard = (_toggleDesktop.IsChecked == true) &&
                              (_toggleStartMenu.IsChecked == true) &&
                              (_toggleAssoc.IsChecked == true);
            bool isMinimal = (_toggleDesktop.IsChecked != true) &&
                             (_toggleStartMenu.IsChecked != true) &&
                             (_toggleAssoc.IsChecked != true);

            SolidColorBrush activeBg = new SolidColorBrush(Color.FromRgb(17, 36, 56));
            SolidColorBrush activeBorder = new SolidColorBrush(Color.FromRgb(56, 189, 248));
            SolidColorBrush inactiveBg = new SolidColorBrush(Color.FromRgb(13, 19, 33));
            SolidColorBrush inactiveBorder = new SolidColorBrush(Color.FromRgb(30, 41, 59));
            SolidColorBrush activeTitle = Brushes.White;
            SolidColorBrush inactiveTitle = new SolidColorBrush(Color.FromRgb(203, 213, 225));

            _btnPresetStandard.Background = isStandard ? activeBg : inactiveBg;
            _btnPresetStandard.BorderBrush = isStandard ? activeBorder : inactiveBorder;
            _btnPresetStandard.BorderThickness = isStandard ? new Thickness(1.5) : new Thickness(1);
            if (_txtPresetStandardTitle != null)
            {
                _txtPresetStandardTitle.Foreground = isStandard ? activeTitle : inactiveTitle;
                _txtPresetStandardTitle.FontWeight = isStandard ? FontWeights.Bold : FontWeights.SemiBold;
            }

            _btnPresetCustom.Background = isMinimal ? activeBg : inactiveBg;
            _btnPresetCustom.BorderBrush = isMinimal ? activeBorder : inactiveBorder;
            _btnPresetCustom.BorderThickness = isMinimal ? new Thickness(1.5) : new Thickness(1);
            if (_txtPresetCustomTitle != null)
            {
                _txtPresetCustomTitle.Foreground = isMinimal ? activeTitle : inactiveTitle;
                _txtPresetCustomTitle.FontWeight = isMinimal ? FontWeights.Bold : FontWeights.SemiBold;
            }
        }

        private void BrowseInstallFolder()
        {
            using (System.Windows.Forms.FolderBrowserDialog dlg = new System.Windows.Forms.FolderBrowserDialog())
            {
                dlg.Description = "AETHER Player를 설치할 상위 폴더를 선택하세요";
                if (dlg.ShowDialog() == System.Windows.Forms.DialogResult.OK && !string.IsNullOrEmpty(dlg.SelectedPath))
                {
                    _txtInstallPath.Text = Path.Combine(dlg.SelectedPath, "AETHER Player");
                }
            }
        }

        private void ShowStep(int step)
        {
            _step = step;
            _pageWelcome.Visibility = (step == 0) ? Visibility.Visible : Visibility.Collapsed;
            _pageOptions.Visibility = (step == 1) ? Visibility.Visible : Visibility.Collapsed;
            _pageProgress.Visibility = (step == 2) ? Visibility.Visible : Visibility.Collapsed;
            _pageFinish.Visibility = (step == 3) ? Visibility.Visible : Visibility.Collapsed;

            string[] headers = new[]
            {
                "STEP 1 OF 4 · WELCOME",
                "STEP 2 OF 4 · CONFIGURATION",
                "STEP 3 OF 4 · INSTALLING",
                "STEP 4 OF 4 · COMPLETE"
            };
            _txtHeaderSub.Text = headers[step];

            for (int i = 0; i < 4; i++)
            {
                if (i < step)
                {
                    _stepBadges[i].Background = new SolidColorBrush(Color.FromRgb(16, 185, 129));
                    _stepNums[i].Text = "✓";
                    _stepNums[i].Foreground = new SolidColorBrush(Color.FromRgb(4, 16, 26));
                    _stepLabels[i].Foreground = new SolidColorBrush(Color.FromRgb(167, 243, 208));
                    _stepLabels[i].FontWeight = FontWeights.Medium;
                }
                else if (i == step)
                {
                    _stepBadges[i].Background = new SolidColorBrush(Color.FromRgb(56, 189, 248));
                    _stepNums[i].Text = (i + 1).ToString(CultureInfo.InvariantCulture);
                    _stepNums[i].Foreground = new SolidColorBrush(Color.FromRgb(4, 16, 26));
                    _stepLabels[i].Foreground = Brushes.White;
                    _stepLabels[i].FontWeight = FontWeights.SemiBold;
                }
                else
                {
                    _stepBadges[i].Background = new SolidColorBrush(Color.FromRgb(23, 32, 51));
                    _stepNums[i].Text = (i + 1).ToString(CultureInfo.InvariantCulture);
                    _stepNums[i].Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184));
                    _stepLabels[i].Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184));
                    _stepLabels[i].FontWeight = FontWeights.Normal;
                }
            }

            _btnBack.Visibility = (step == 1) ? Visibility.Visible : Visibility.Collapsed;
            _btnCancel.Visibility = (step == 3) ? Visibility.Collapsed : Visibility.Visible;
            if (step == 0) _btnNext.Content = "다음 →";
            else if (step == 1) _btnNext.Content = _isUpgrade ? "지금 업데이트" : "지금 설치";
            else if (step == 3) _btnNext.Content = "완료";
        }

        private void AppendLog(string line)
        {
            _window.Dispatcher.BeginInvoke(new Action(delegate
            {
                if (!string.IsNullOrEmpty(_txtInstallLog.Text)) _txtInstallLog.Text += "\n";
                _txtInstallLog.Text += "[" + DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture) + "] " + line;
            }));
        }

        private void SetProgressUi(int pct, string status)
        {
            _window.Dispatcher.BeginInvoke(new Action(delegate
            {
                int p = Math.Max(0, Math.Min(100, pct));
                _txtProgressPct.Text = p + "%";
                if (!string.IsNullOrEmpty(status)) _txtProgressStatus.Text = status;
                double trackW = _progressTrack.ActualWidth > 0 ? _progressTrack.ActualWidth : 534.0;
                _progressFill.Width = (trackW * p) / 100.0;
            }));
        }

        private async Task ExecuteInstallAsync()
        {
            string targetDir = _txtInstallPath.Text.Trim();
            if (string.IsNullOrWhiteSpace(targetDir))
            {
                MessageBox.Show(_window, "설치 폴더 경로를 입력해 주세요.", "AETHER 설치", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            bool mkDesktop = _toggleDesktop.IsChecked == true;
            bool mkStart = _toggleStartMenu.IsChecked == true;
            bool regAssoc = _toggleAssoc.IsChecked == true;

            _busy = true;
            _btnBack.IsEnabled = false;
            _btnCancel.IsEnabled = false;
            _btnNext.IsEnabled = false;
            _txtInstallLog.Text = string.Empty;
            ShowStep(2);

            try
            {
                SetProgressUi(5, "실행 중인 프로그램 확인 중...");
                AppendLog("설치 대상 경로: " + targetDir);

                int matchedCore = 0;
                int totalCore = 5;

                await Task.Run(delegate
                {
                    InstallerEntry.StopRunningAppInstances(targetDir, 0, AppendLog);

                    SetProgressUi(15, "프로그램 파일 압축 해제 중...");
                    InstallerEntry.ExtractPayloadWithRetry(targetDir, delegate(int pct)
                    {
                        int mapped = 15 + (pct * 65) / 100;
                        SetProgressUi(mapped, "핵심 런타임 및 UI 리소스 설치 중...");
                    }, AppendLog);
                    AppendLog("AETHER Player.exe 및 WebView2 구성 요소 설치 완료");

                    string exePath = Path.Combine(targetDir, "AETHER Player.exe");
                    string iconPath = Path.Combine(targetDir, "assets", "aether.ico");
                    string uninstallerPath = Path.Combine(targetDir, "Uninstall AETHER Player.exe");

                    SetProgressUi(84, "제거 도구 및 바로가기 구성 중...");
                    try
                    {
                        File.Copy(Assembly.GetExecutingAssembly().Location, uninstallerPath, true);
                        AppendLog("제거 도구 생성: Uninstall AETHER Player.exe");
                    }
                    catch { }

                    if (mkDesktop)
                    {
                        string desktopLnk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "AETHER Player.lnk");
                        InstallerEntry.CreateShortcut(desktopLnk, exePath, targetDir, iconPath, "AETHER PIP Media Player", null);
                        AppendLog("바탕 화면 바로가기 생성 완료");
                    }

                    if (mkStart)
                    {
                        string startFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "AETHER Player");
                        Directory.CreateDirectory(startFolder);
                        InstallerEntry.CreateShortcut(Path.Combine(startFolder, "AETHER Player.lnk"), exePath, targetDir, iconPath, "AETHER PIP Media Player", null);
                        InstallerEntry.CreateShortcut(Path.Combine(startFolder, "Uninstall AETHER Player.lnk"), uninstallerPath, targetDir, iconPath, "AETHER Player 제거", "--uninstall");
                        AppendLog("시작 메뉴 바로가기 등록 완료");
                    }

                    if (regAssoc)
                    {
                        SetProgressUi(92, "파일 연결 프로그램 등록 중...");
                        FileAssociation.Register(exePath);
                        int localMatched;
                        int localTotal;
                        FileAssociation.GetDefaultStatus(out localMatched, out localTotal);
                        matchedCore = localMatched;
                        totalCore = localTotal;
                        AppendLog(string.Format(CultureInfo.InvariantCulture, "MP4 / WebM / MKV / MP3 / .part 연결 등록 완료 ({0}/{1} 기본 적용)", localMatched, localTotal));
                    }

                    InstallerEntry.RegisterUninstallEntry(targetDir, uninstallerPath, iconPath);
                    AppendLog("Windows 프로그램 목록 등록 완료 (v" + AppConfig.Version + ")");
                    SetProgressUi(100, "설치 완료!");
                });

                _txtFinishTitle.Text = _isUpgrade ? ("v" + AppConfig.Version + " 업데이트가 완료되었습니다!") : "설치가 성공적으로 완료되었습니다!";
                _txtFinishPath.Text = "설치 경로: " + Path.GetFullPath(targetDir);

                if (regAssoc)
                {
                    _assocFinishCard.Visibility = Visibility.Visible;
                    _btnOpenDefaultApps.Visibility = Visibility.Visible;
                    if (matchedCore >= totalCore)
                    {
                        _txtAssocFinishHint.Text = "✓ 모든 핵심 미디어 확장자(MP4 · WebM · MKV · MP3 · .part)가 AETHER Player로 연결되었습니다.";
                        _toggleOpenDefaultApps.IsChecked = false;
                    }
                    else
                    {
                        _txtAssocFinishHint.Text = string.Format(
                            CultureInfo.InvariantCulture,
                            "Windows 11 보안 정책상 기존 앱이 지정된 형식({0}/{1} 기본 적용)은 열린 설정 상단의 [기본값 설정]을 1번 눌러야 최종 전환됩니다.",
                            matchedCore,
                            totalCore
                        );
                        _toggleOpenDefaultApps.IsChecked = true;
                    }
                }
                else
                {
                    _assocFinishCard.Visibility = Visibility.Collapsed;
                    _btnOpenDefaultApps.Visibility = Visibility.Collapsed;
                    _toggleOpenDefaultApps.IsChecked = false;
                }

                _busy = false;
                _btnNext.IsEnabled = true;
                ShowStep(3);
            }
            catch (Exception ex)
            {
                AppendLog("오류 발생: " + ex.Message);
                MessageBox.Show(_window, "설치 중 오류가 발생했습니다:\n\n" + ex.Message, "AETHER 설치 오류", MessageBoxButton.OK, MessageBoxImage.Error);
                _busy = false;
                _btnBack.IsEnabled = true;
                _btnCancel.IsEnabled = true;
                _btnNext.IsEnabled = true;
                ShowStep(1);
            }
        }

        private void FinishAndClose()
        {
            try
            {
                if (_toggleOpenDefaultApps != null && _toggleOpenDefaultApps.IsChecked == true)
                {
                    FileAssociation.OpenWindowsDefaultAppsSettings();
                }
            }
            catch { }

            try
            {
                if (_toggleLaunchAfter.IsChecked == true)
                {
                    string dir = _txtInstallPath.Text.Trim();
                    string exePath = Path.Combine(dir, "AETHER Player.exe");
                    if (File.Exists(exePath))
                    {
                        Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = dir });
                    }
                }
            }
            catch { }
            _window.Close();
        }

        private async Task ExecuteUninstallAsync()
        {
            bool wipeData = _toggleRemoveUserData.IsChecked == true;
            _busy = true;
            _btnCancel.IsEnabled = false;
            _btnNext.IsEnabled = false;
            _txtUninstallLog.Text = string.Empty;

            Action<string> appendUnLog = delegate(string msg)
            {
                _window.Dispatcher.BeginInvoke(new Action(delegate
                {
                    if (!string.IsNullOrEmpty(_txtUninstallLog.Text)) _txtUninstallLog.Text += "\n";
                    _txtUninstallLog.Text += msg;
                }));
            };

            try
            {
                await Task.Run(delegate
                {
                    InstallerEntry.StopRunningAppInstances(AppDomain.CurrentDomain.BaseDirectory, 0, appendUnLog);
                    _window.Dispatcher.BeginInvoke(new Action(delegate { _uninstallProgressFill.Width = 180; }));

                    FileAssociation.Unregister();
                    appendUnLog("Windows 탐색기 파일 연결 해제 완료");

                    try
                    {
                        string desktopLnk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "AETHER Player.lnk");
                        if (File.Exists(desktopLnk)) File.Delete(desktopLnk);
                        appendUnLog("바탕 화면 바로가기 삭제 완료");
                    }
                    catch { }

                    try
                    {
                        string startFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "AETHER Player");
                        if (Directory.Exists(startFolder)) Directory.Delete(startFolder, true);
                        appendUnLog("시작 메뉴 폴더 삭제 완료");
                    }
                    catch { }

                    try
                    {
                        Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\AetherPlayer", false);
                        appendUnLog("제거 레지스트리 항목 정리 완료");
                    }
                    catch { }

                    if (wipeData)
                    {
                        try
                        {
                            string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AetherPlayer");
                            if (Directory.Exists(dataDir)) Directory.Delete(dataDir, true);
                            appendUnLog("사용자 설정 및 WebView2 데이터 삭제 완료");
                        }
                        catch { }
                    }

                    _window.Dispatcher.BeginInvoke(new Action(delegate { _uninstallProgressFill.Width = 534; }));
                });

                string installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "cmd.exe";
                    psi.Arguments = string.Format(CultureInfo.InvariantCulture, "/c ping 127.0.0.1 -n 2 > nul & rd /s /q \"{0}\"", installDir);
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    Process.Start(psi);
                }
                catch { }

                MessageBox.Show(_window, "AETHER Player가 정상적으로 제거되었습니다.", "AETHER 제거 완료", MessageBoxButton.OK, MessageBoxImage.Information);
                _busy = false;
                _window.Close();
            }
            catch (Exception ex)
            {
                appendUnLog("오류: " + ex.Message);
                _busy = false;
                _btnCancel.IsEnabled = true;
                _btnNext.IsEnabled = true;
            }
        }
    }
}
