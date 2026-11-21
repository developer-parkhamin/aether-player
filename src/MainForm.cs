using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace AetherPlayer
{
    internal sealed class MainForm : Form
    {
        private const string VirtualHostName = "aether.app";
        private static readonly string AppVersion = AutoUpdater.CurrentVersion;

        private static readonly string[] MediaExts = new[]
        {
            ".mp4", ".webm", ".mkv", ".mp3",
            ".m4v", ".mov", ".ogv", ".wav", ".ogg", ".flac", ".m4a", ".aac",
            ".mp4.part", ".webm.part", ".mkv.part", ".m4v.part", ".mp3.part", ".part"
        };

        // Win32 Constants
        private const int WM_NCHITTEST = 0x0084;
        private const int WM_NCLBUTTONDOWN = 0x00A1;
        private const int WM_SIZING = 0x0214;
        private const int WM_MOVING = 0x0216;
        private const int WM_EXITSIZEMOVE = 0x0232;
        private const int WM_HOTKEY = 0x0312;

        internal const int WMSZ_LEFT = 1;
        internal const int WMSZ_RIGHT = 2;
        internal const int WMSZ_TOP = 3;
        internal const int WMSZ_TOPLEFT = 4;
        internal const int WMSZ_TOPRIGHT = 5;
        internal const int WMSZ_BOTTOM = 6;
        internal const int WMSZ_BOTTOMLEFT = 7;
        internal const int WMSZ_BOTTOMRIGHT = 8;

        internal const int PipFrameExtraX = 10;
        internal const int PipFrameExtraY = 10;

        private const int GWL_EXSTYLE = -20;
        private const int WS_EX_TRANSPARENT = 0x00000020;
        private const int WS_EX_LAYERED = 0x00080000;

        private const int HTCAPTION = 2;
        private const int HTLEFT = 10;
        private const int HTRIGHT = 11;
        private const int HTTOP = 12;
        private const int HTTOPLEFT = 13;
        private const int HTTOPRIGHT = 14;
        private const int HTBOTTOM = 15;
        private const int HTBOTTOMLEFT = 16;
        private const int HTBOTTOMRIGHT = 17;

        private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
        private const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
        private const int DWMWCP_ROUND = 2;

        private const uint MOD_ALT = 0x0001;
        private const uint MOD_SHIFT = 0x0004;
        private const uint SWP_NOSIZE = 0x0001;
        private const uint SWP_NOMOVE = 0x0002;
        private const uint SWP_NOACTIVATE = 0x0010;
        private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);

        private const int HOTKEY_PIP_ID = 0xA101;
        private const int HOTKEY_PLAY_ID = 0xA102;
        private const int HOTKEY_GHOST_ID = 0xA103;

        [StructLayout(LayoutKind.Sequential)]
        internal struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        private readonly List<string> _initialFiles;
        private readonly bool _devMode;
        private readonly MediaServer _mediaServer;
        private readonly JavaScriptSerializer _json = new JavaScriptSerializer();
        private readonly CancellationTokenSource _pipeCts = new CancellationTokenSource();

        private WebView2 _webView;
        private NotifyIcon _trayIcon;
        private bool _webViewReady;
        private bool _uiReady;

        // Window State
        private bool _isPiPMode;
        private bool _isGhostMode;
        private bool _userPinnedTopMost;
        private bool _isMaximizedCustom;
        private bool _isFullscreenCustom;
        private bool _savedMaximizedBeforePiP;
        private bool _savedMaximizedBeforeFs;
        private Rectangle _normalBounds;
        private Rectangle _savedPiPBounds;
        private bool _hasSavedPiPBounds;
        private double _pipOpacity = 1.0;
        private double _pipAspectRatio = 16.0 / 9.0;
        private bool _pipLockAspect = true;
        private bool _globalHotkeysEnabled = true;
        private bool _isWindowMoveDrag;
        private bool _dragLeftTopZone;
        private bool _topSnapHintActive;
        private Rectangle _preDragNormalBounds;
        private UpdateConfig _updateConfig;
        private UpdateCheckResult _latestUpdate;
        private bool _isDownloadingUpdate;

        [DllImport("user32.dll")]
        private static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        [DllImport("user32.dll")]
        private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr", SetLastError = true)]
        private static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr", SetLastError = true)]
        private static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        [DllImport("shlwapi.dll", CharSet = CharSet.Unicode)]
        private static extern int StrCmpLogicalW(string psz1, string psz2);

        public MainForm(List<string> initialFiles, bool devMode)
        {
            _initialFiles = initialFiles ?? new List<string>();
            _devMode = devMode;
            _mediaServer = new MediaServer();

            Text = "AETHER Player";
            FormBorderStyle = FormBorderStyle.None;
            BackColor = Color.FromArgb(6, 7, 11);
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(1240, 760);
            MinimumSize = new Size(760, 480);
            Padding = new Padding(4);
            DoubleBuffered = true;
            KeyPreview = false;

            LoadAppIcon();
            InitTrayIcon();
            InitWebViewControl();
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ClassStyle |= 0x00020000; // CS_DROPSHADOW
                return cp;
            }
        }

        private void LoadAppIcon()
        {
            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "aether.ico");
                if (File.Exists(iconPath))
                {
                    Icon = new Icon(iconPath);
                }
            }
            catch { }
        }

        private void InitTrayIcon()
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem showItem = new ToolStripMenuItem("AETHER 창 보이기");
            showItem.Click += delegate { RestoreAndActivate(); };

            ToolStripMenuItem pipItem = new ToolStripMenuItem("PIP 모드 전환 (Alt+Shift+P)");
            pipItem.Click += delegate
            {
                RestoreIfMinimized();
                PostToUi(new Dictionary<string, object> { { "type", "hotkey:pip" } });
            };

            ToolStripMenuItem ghostItem = new ToolStripMenuItem("PIP 고스트 모드(클릭 통과) 전환 (Alt+Shift+G)");
            ghostItem.Click += delegate
            {
                RestoreIfMinimized();
                PostToUi(new Dictionary<string, object> { { "type", "hotkey:ghost" } });
            };

            ToolStripMenuItem playItem = new ToolStripMenuItem("재생 / 일시정지 (Alt+Shift+Space)");
            playItem.Click += delegate
            {
                PostToUi(new Dictionary<string, object> { { "type", "hotkey:play" } });
            };

            ToolStripMenuItem exitItem = new ToolStripMenuItem("종료");
            exitItem.Click += delegate { Close(); };

            menu.Items.Add(showItem);
            menu.Items.Add(pipItem);
            menu.Items.Add(ghostItem);
            menu.Items.Add(playItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(exitItem);

            _trayIcon = new NotifyIcon();
            _trayIcon.Text = "AETHER Media Player";
            _trayIcon.Icon = Icon != null ? Icon : SystemIcons.Application;
            _trayIcon.ContextMenuStrip = menu;
            _trayIcon.Visible = true;
            _trayIcon.DoubleClick += delegate
            {
                SetGhostMode(false);
                RestoreAndActivate();
                PushWindowState();
            };
        }

        private void InitWebViewControl()
        {
            _webView = new WebView2();
            _webView.Dock = DockStyle.Fill;
            _webView.DefaultBackgroundColor = Color.FromArgb(6, 7, 11);
            Controls.Add(_webView);
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            ApplyDwmAttributes();
            if (_globalHotkeysEnabled)
            {
                RegisterGlobalHotkeys();
            }
        }

        private void ApplyDwmAttributes()
        {
            try
            {
                int dark = 1;
                DwmSetWindowAttribute(Handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref dark, sizeof(int));
                int round = DWMWCP_ROUND;
                DwmSetWindowAttribute(Handle, DWMWA_WINDOW_CORNER_PREFERENCE, ref round, sizeof(int));
            }
            catch { }
        }

        protected override async void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            _normalBounds = Bounds;

            StartPipeListener();

            try
            {
                string userDataDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "AetherPlayer",
                    "WebView2"
                );
                Directory.CreateDirectory(userDataDir);

                CoreWebView2EnvironmentOptions options = new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required");
                CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, userDataDir, options);
                await _webView.EnsureCoreWebView2Async(env);

                string uiDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ui");
                CoreWebView2 core = _webView.CoreWebView2;

                core.SetVirtualHostNameToFolderMapping(VirtualHostName, uiDir, CoreWebView2HostResourceAccessKind.Allow);
                core.Settings.AreDefaultContextMenusEnabled = false;
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.IsZoomControlEnabled = false;
                core.Settings.AreBrowserAcceleratorKeysEnabled = false;
                core.Settings.AreDevToolsEnabled = _devMode;

                core.WebMessageReceived += OnWebMessageReceived;
                core.NewWindowRequested += OnNewWindowRequested;
                core.WindowCloseRequested += delegate { BeginInvoke(new Action(Close)); };

                _webViewReady = true;
                core.Navigate(string.Format(CultureInfo.InvariantCulture, "https://{0}/index.html", VirtualHostName));
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "AETHER 실행 초기화 중 오류가 발생했습니다.\n\n" + ex.Message,
                    "AETHER Player",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                Close();
            }
        }

        private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
        }

        private void StartPipeListener()
        {
            CancellationToken token = _pipeCts.Token;
            Task.Run(async delegate
            {
                while (!token.IsCancellationRequested)
                {
                    bool delayAfterError = false;
                    try
                    {
                        using (NamedPipeServerStream pipe = new NamedPipeServerStream(
                            Program.SingleInstancePipeName,
                            PipeDirection.In,
                            1,
                            PipeTransmissionMode.Byte,
                            PipeOptions.Asynchronous))
                        {
                            await pipe.WaitForConnectionAsync(token).ConfigureAwait(false);
                            List<string> incomingFiles = new List<string>();
                            bool activateOnly = false;

                            using (StreamReader reader = new StreamReader(pipe, new UTF8Encoding(false)))
                            {
                                string line;
                                while ((line = await reader.ReadLineAsync().ConfigureAwait(false)) != null)
                                {
                                    string clean = line.Trim().Trim('\uFEFF');
                                    if (string.IsNullOrEmpty(clean)) continue;
                                    if (clean == "__ACTIVATE__")
                                    {
                                        activateOnly = true;
                                    }
                                    else if (File.Exists(clean))
                                    {
                                        incomingFiles.Add(clean);
                                    }
                                }
                            }

                            if (!IsDisposed && IsHandleCreated)
                            {
                                BeginInvoke(new Action(delegate
                                {
                                    if (activateOnly || incomingFiles.Count > 0)
                                    {
                                        SetGhostMode(false);
                                        RestoreAndActivate();
                                        PushWindowState();
                                    }
                                    if (incomingFiles.Count > 0)
                                    {
                                        if (_uiReady)
                                        {
                                            SendRegisteredFilesToUi(incomingFiles);
                                        }
                                        else
                                        {
                                            _initialFiles.AddRange(incomingFiles);
                                        }
                                    }
                                }));
                            }
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch
                    {
                        delayAfterError = true;
                    }

                    if (delayAfterError)
                    {
                        try { await Task.Delay(250, token).ConfigureAwait(false); } catch { break; }
                    }
                }
            }, token);
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            Dictionary<string, object> msg;
            try
            {
                msg = _json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson);
            }
            catch
            {
                return;
            }
            if (msg == null) return;

            string type = GetString(msg, "type", string.Empty);
            switch (type)
            {
                case "ui:ready":
                    _uiReady = true;
                    _updateConfig = AutoUpdater.LoadConfig();
                    PushWindowState();
                    PushAssocState();
                    PushUpdateConfig();
                    if (_initialFiles.Count > 0)
                    {
                        SendRegisteredFilesToUi(_initialFiles);
                        _initialFiles.Clear();
                    }
                    ScheduleStartupUpdateCheck();
                    break;

                case "window:drag":
                    StartWindowMoveDrag();
                    break;

                case "window:resize":
                    if (!_isFullscreenCustom && !_isMaximizedCustom && !_isGhostMode)
                    {
                        ReleaseCapture();
                        SendMessage(Handle, WM_NCLBUTTONDOWN, new IntPtr(HTBOTTOMRIGHT), IntPtr.Zero);
                    }
                    break;

                case "window:minimize":
                    WindowState = FormWindowState.Minimized;
                    break;

                case "window:toggleMaximize":
                    ToggleMaximize();
                    break;

                case "window:toggleFullscreen":
                    ToggleFullscreen();
                    break;

                case "window:close":
                    Close();
                    break;

                case "window:setTopMost":
                    _userPinnedTopMost = GetBool(msg, "enabled", !_userPinnedTopMost);
                    if (!_isPiPMode && !_isFullscreenCustom)
                    {
                        TopMost = _userPinnedTopMost;
                    }
                    PushWindowState();
                    break;

                case "window:setTitle":
                    string title = GetString(msg, "title", "AETHER Player");
                    Text = string.IsNullOrWhiteSpace(title) ? "AETHER Player" : title + " — AETHER";
                    break;

                case "pip:enter":
                    EnterPiPMode(
                        GetInt(msg, "width", 460),
                        GetInt(msg, "height", 262),
                        GetString(msg, "corner", "br"),
                        GetDouble(msg, "opacity", _pipOpacity),
                        GetDouble(msg, "ratio", 0)
                    );
                    break;

                case "pip:exit":
                    ExitPiPMode();
                    break;

                case "pip:snap":
                    if (_isPiPMode)
                    {
                        SnapPiPToCorner(GetString(msg, "corner", "br"));
                    }
                    break;

                case "pip:presetSize":
                    if (_isPiPMode)
                    {
                        ApplyPiPPresetSize(
                            GetString(msg, "preset", "m"),
                            GetDouble(msg, "ratio", 0)
                        );
                    }
                    break;

                case "pip:fitAspect":
                    if (_isPiPMode)
                    {
                        FitPiPAspectRatio(GetDouble(msg, "ratio", 16.0 / 9.0));
                    }
                    break;

                case "pip:setAspect":
                    {
                        double aspect = GetDouble(msg, "ratio", 0);
                        _pipLockAspect = GetBool(msg, "lockAspect", _pipLockAspect);
                        if (aspect > 0.1)
                        {
                            _pipAspectRatio = ClampDouble(aspect, 0.3, 3.0);
                        }
                        bool fitNow = GetBool(msg, "fitNow", false);
                        if (_isPiPMode && fitNow)
                        {
                            FitPiPAspectRatio(_pipAspectRatio);
                        }
                    }
                    break;

                case "pip:setOpacity":
                    SetPiPOpacity(GetDouble(msg, "opacity", 1.0));
                    break;

                case "pip:setGhost":
                    if (_isPiPMode)
                    {
                        SetGhostMode(GetBool(msg, "enabled", !_isGhostMode));
                        PushWindowState();
                    }
                    break;

                case "pip:setGlobalHotkeys":
                    SetGlobalHotkeysEnabled(GetBool(msg, "enabled", true));
                    break;

                case "dialog:openFiles":
                    OpenNativeFilesDialog();
                    break;

                case "dialog:openFolder":
                    OpenNativeFolderDialog();
                    break;

                case "files:openPaths":
                    OpenSavedPaths(msg);
                    break;

                case "dialog:savePlaylist":
                    SaveM3uPlaylistDialog(msg);
                    break;

                case "dialog:openPlaylist":
                    OpenM3uPlaylistDialog();
                    break;

                case "dialog:saveScreenshot":
                    SaveScreenshotDialog(
                        GetString(msg, "filename", "aether-capture.png"),
                        GetString(msg, "dataUrl", string.Empty)
                    );
                    break;

                case "assoc:status":
                    PushAssocState();
                    break;

                case "assoc:set":
                    SetFileAssociation(GetBool(msg, "enabled", true));
                    break;

                case "assoc:openSettings":
                    OpenDefaultAppsSettingsFromUi();
                    break;

                case "update:getConfig":
                    PushUpdateConfig();
                    break;

                case "update:saveConfig":
                    SaveUpdateConfigFromUi(msg);
                    break;

                case "update:check":
                    Task ignoredCheck = RunUpdateCheckAsync(false);
                    break;

                case "update:downloadAndInstall":
                    Task ignoredDl = RunDownloadAndInstallUpdateAsync();
                    break;
            }
        }

        private void EnterPiPMode(int reqWidth, int reqHeight, string corner, double opacity, double ratio)
        {
            if (ratio > 0.1)
            {
                _pipAspectRatio = ClampDouble(ratio, 0.3, 3.0);
            }

            if (_isPiPMode)
            {
                SetPiPOpacity(opacity);
                if (ratio > 0.1 || _pipLockAspect) FitPiPAspectRatio(_pipAspectRatio);
                PushWindowState();
                return;
            }

            if (_isFullscreenCustom)
            {
                _isFullscreenCustom = false;
                _savedMaximizedBeforePiP = _savedMaximizedBeforeFs;
            }
            else
            {
                _savedMaximizedBeforePiP = _isMaximizedCustom;
                if (!_isMaximizedCustom)
                {
                    _normalBounds = Bounds;
                }
            }

            _isMaximizedCustom = false;
            _isPiPMode = true;
            Padding = new Padding(4);
            MinimumSize = new Size(120, 100);

            Screen currentScreen = Screen.FromHandle(Handle);
            Rectangle work = currentScreen.WorkingArea;
            double activeRatio = ratio > 0.1 ? _pipAspectRatio : (_pipLockAspect ? _pipAspectRatio : 0);

            Rectangle targetBounds;
            if (_hasSavedPiPBounds && work.IntersectsWith(_savedPiPBounds))
            {
                targetBounds = ClampToWorkArea(_savedPiPBounds, work);
                if (activeRatio > 0.1)
                {
                    targetBounds = ComputeAspectRectFromRect(targetBounds, work, activeRatio);
                }
            }
            else
            {
                Size initialSize;
                if (activeRatio > 0.1)
                {
                    initialSize = ComputeAspectSize(Math.Max(reqWidth, reqHeight), activeRatio, work);
                }
                else
                {
                    int w = ClampInt(reqWidth, 260, Math.Min(960, work.Width - 40));
                    int h = ClampInt(reqHeight, 160, Math.Min(680, work.Height - 40));
                    initialSize = new Size(w, h);
                }
                targetBounds = ComputeCornerRect(work, initialSize.Width, initialSize.Height, corner);
            }

            Bounds = targetBounds;
            _pipOpacity = ClampDouble(opacity, 0.35, 1.0);
            Opacity = _pipOpacity;
            TopMost = true;
            SetWindowPos(Handle, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);

            PushWindowState();
        }

        private void ExitPiPMode()
        {
            SetGhostMode(false);
            if (!_isPiPMode)
            {
                PushWindowState();
                return;
            }

            _savedPiPBounds = Bounds;
            _hasSavedPiPBounds = true;
            _isPiPMode = false;

            Opacity = 1.0;
            TopMost = _userPinnedTopMost;
            MinimumSize = new Size(760, 480);

            if (_savedMaximizedBeforePiP)
            {
                ApplyCustomMaximize();
            }
            else
            {
                _isMaximizedCustom = false;
                Padding = new Padding(4);
                Screen screen = Screen.FromHandle(Handle);
                if (_normalBounds.Width >= 760 && _normalBounds.Height >= 480)
                {
                    Bounds = ClampToWorkArea(_normalBounds, screen.WorkingArea);
                }
                else
                {
                    Bounds = new Rectangle(
                        screen.WorkingArea.Left + Math.Max(0, (screen.WorkingArea.Width - 1240) / 2),
                        screen.WorkingArea.Top + Math.Max(0, (screen.WorkingArea.Height - 760) / 2),
                        Math.Min(1240, screen.WorkingArea.Width),
                        Math.Min(760, screen.WorkingArea.Height)
                    );
                }
            }

            PushWindowState();
        }

        private void SnapPiPToCorner(string corner)
        {
            Screen screen = Screen.FromHandle(Handle);
            Rectangle work = screen.WorkingArea;
            Rectangle target = ComputeCornerRect(work, Width, Height, corner);
            Bounds = target;
            _savedPiPBounds = target;
            _hasSavedPiPBounds = true;
        }

        private void ApplyPiPPresetSize(string preset, double ratio)
        {
            int longSide = 460;
            if (string.Equals(preset, "s", StringComparison.OrdinalIgnoreCase))
            {
                longSide = 340;
            }
            else if (string.Equals(preset, "l", StringComparison.OrdinalIgnoreCase))
            {
                longSide = 640;
            }

            if (ratio > 0.1)
            {
                _pipAspectRatio = ClampDouble(ratio, 0.3, 3.0);
            }

            Screen screen = Screen.FromHandle(Handle);
            Rectangle work = screen.WorkingArea;
            double useRatio = (ratio > 0.1) ? _pipAspectRatio : (_pipLockAspect ? _pipAspectRatio : 0);

            int w;
            int h;
            if (useRatio > 0.1)
            {
                Size fitted = ComputeAspectSize(longSide, useRatio, work);
                w = fitted.Width;
                h = fitted.Height;
            }
            else
            {
                w = Math.Min(longSide, work.Width - 32);
                h = Math.Min((int)Math.Round(longSide * 9.0 / 16.0), work.Height - 32);
            }

            int newX = Left;
            int newY = Top;
            if (Right > work.Left + work.Width / 2) newX = Right - w;
            if (Bottom > work.Top + work.Height / 2) newY = Bottom - h;

            Rectangle next = ClampToWorkArea(new Rectangle(newX, newY, w, h), work);
            Bounds = next;
            _savedPiPBounds = next;
            _hasSavedPiPBounds = true;
        }

        private void FitPiPAspectRatio(double ratio)
        {
            if (ratio > 0.1)
            {
                _pipAspectRatio = ClampDouble(ratio, 0.3, 3.0);
            }
            if (_pipAspectRatio <= 0.1) return;

            Screen screen = Screen.FromHandle(Handle);
            Rectangle work = screen.WorkingArea;
            Rectangle next = ComputeAspectRectFromRect(Bounds, work, _pipAspectRatio);
            Bounds = next;
            _savedPiPBounds = next;
            _hasSavedPiPBounds = true;
        }

        internal static Size ComputeAspectSize(int longSide, double ratio, Rectangle work)
        {
            double r = ClampDouble(ratio, 0.3, 3.0);
            double maxInnerW = Math.Max(200.0, work.Width - 36 - PipFrameExtraX);
            double maxInnerH = Math.Max(160.0, work.Height - 36 - PipFrameExtraY);
            double minInnerW = Math.Max(150.0, 110.0 * r);
            double maxBoundW = Math.Min(maxInnerW, maxInnerH * r);
            if (maxBoundW < minInnerW) minInnerW = maxBoundW;

            double desiredInnerW = (r >= 1.0) ? (double)longSide : ((double)longSide * r);
            double innerW = ClampDouble(desiredInnerW, minInnerW, maxBoundW);
            double innerH = innerW / r;
            return new Size((int)Math.Round(innerW) + PipFrameExtraX, (int)Math.Round(innerH) + PipFrameExtraY);
        }

        internal static Rectangle ComputeAspectRectFromRect(Rectangle current, Rectangle work, double ratio)
        {
            double r = ClampDouble(ratio, 0.3, 3.0);
            double curInnerW = Math.Max(1.0, current.Width - PipFrameExtraX);
            double curInnerH = Math.Max(1.0, current.Height - PipFrameExtraY);
            double area = Math.Max(40000.0, curInnerW * curInnerH);

            double maxInnerW = Math.Max(200.0, work.Width - 36 - PipFrameExtraX);
            double maxInnerH = Math.Max(160.0, work.Height - 36 - PipFrameExtraY);
            double minInnerW = Math.Max(150.0, 110.0 * r);
            double maxBoundW = Math.Min(maxInnerW, maxInnerH * r);
            if (maxBoundW < minInnerW) minInnerW = maxBoundW;

            double innerW = ClampDouble(Math.Sqrt(area * r), minInnerW, maxBoundW);
            double innerH = innerW / r;
            Size sz = new Size((int)Math.Round(innerW) + PipFrameExtraX, (int)Math.Round(innerH) + PipFrameExtraY);

            int newX = current.Left;
            int newY = current.Top;
            if (current.Right > work.Left + work.Width / 2) newX = current.Right - sz.Width;
            if (current.Bottom > work.Top + work.Height / 2) newY = current.Bottom - sz.Height;
            return ClampToWorkArea(new Rectangle(newX, newY, sz.Width, sz.Height), work);
        }

        internal static RECT AdjustRectForAspect(RECT rect, int edge, double ratio, Rectangle work, int padX, int padY)
        {
            double r = ClampDouble(ratio, 0.3, 3.0);
            double maxInnerW = Math.Max(200.0, work.Width - 20 - padX);
            double maxInnerH = Math.Max(160.0, work.Height - 20 - padY);
            double minInnerW = Math.Max(150.0, 110.0 * r);
            double maxBoundW = Math.Min(maxInnerW, maxInnerH * r);
            if (maxBoundW < minInnerW) minInnerW = maxBoundW;

            double curInnerW = Math.Max(1.0, (rect.Right - rect.Left) - padX);
            double curInnerH = Math.Max(1.0, (rect.Bottom - rect.Top) - padY);

            double targetInnerW;
            if (edge == WMSZ_LEFT || edge == WMSZ_RIGHT)
            {
                targetInnerW = curInnerW;
            }
            else if (edge == WMSZ_TOP || edge == WMSZ_BOTTOM)
            {
                targetInnerW = curInnerH * r;
            }
            else
            {
                double scale = (curInnerW * r + curInnerH) / (r * r + 1.0);
                targetInnerW = scale * r;
            }

            targetInnerW = ClampDouble(targetInnerW, minInnerW, maxBoundW);
            double targetInnerH = targetInnerW / r;
            int newW = (int)Math.Round(targetInnerW) + padX;
            int newH = (int)Math.Round(targetInnerH) + padY;

            if (edge == WMSZ_LEFT || edge == WMSZ_TOPLEFT || edge == WMSZ_BOTTOMLEFT)
            {
                rect.Left = rect.Right - newW;
            }
            else
            {
                rect.Right = rect.Left + newW;
            }

            if (edge == WMSZ_TOP || edge == WMSZ_TOPLEFT || edge == WMSZ_TOPRIGHT)
            {
                rect.Top = rect.Bottom - newH;
            }
            else
            {
                rect.Bottom = rect.Top + newH;
            }

            return rect;
        }

        private void SetPiPOpacity(double opacity)
        {
            _pipOpacity = ClampDouble(opacity, 0.35, 1.0);
            if (_isPiPMode)
            {
                Opacity = _pipOpacity;
            }
            PushWindowState();
        }

        private void SetGhostMode(bool enabled)
        {
            if (!_isPiPMode && enabled) enabled = false;
            _isGhostMode = enabled;
            if (!IsHandleCreated) return;

            try
            {
                long exStyle = GetWindowLongPtr(Handle, GWL_EXSTYLE).ToInt64();
                if (enabled)
                {
                    exStyle |= WS_EX_LAYERED | WS_EX_TRANSPARENT;
                    if (_pipOpacity > 0.92)
                    {
                        _pipOpacity = 0.78;
                        Opacity = _pipOpacity;
                    }
                }
                else
                {
                    exStyle &= ~((long)WS_EX_TRANSPARENT);
                }
                SetWindowLongPtr(Handle, GWL_EXSTYLE, new IntPtr(exStyle));
            }
            catch { }
        }

        private void ToggleMaximize()
        {
            if (_isPiPMode) ExitPiPMode();
            if (_isFullscreenCustom) _isFullscreenCustom = false;

            if (_isMaximizedCustom)
            {
                _isMaximizedCustom = false;
                Padding = new Padding(4);
                Bounds = _normalBounds;
            }
            else
            {
                _normalBounds = Bounds;
                ApplyCustomMaximize();
            }
            PushWindowState();
        }

        private void ApplyCustomMaximize()
        {
            _isMaximizedCustom = true;
            Padding = Padding.Empty;
            Screen screen = Screen.FromHandle(Handle);
            Bounds = screen.WorkingArea;
        }

        private void StartWindowMoveDrag()
        {
            if (_isGhostMode) return;

            bool wasFs = _isFullscreenCustom;
            bool wasMax = _isMaximizedCustom;

            if (wasFs || wasMax)
            {
                Point cur = Cursor.Position;
                Screen scr = Screen.FromPoint(cur);
                double xRatio = ClampDouble((double)(cur.X - Left) / Math.Max(1, Width), 0.12, 0.88);
                int nw = (_normalBounds.Width >= 760 && _normalBounds.Height >= 480)
                    ? Math.Min(_normalBounds.Width, scr.WorkingArea.Width)
                    : Math.Min(1240, scr.WorkingArea.Width);
                int nh = (_normalBounds.Width >= 760 && _normalBounds.Height >= 480)
                    ? Math.Min(_normalBounds.Height, scr.WorkingArea.Height)
                    : Math.Min(760, scr.WorkingArea.Height);

                _isFullscreenCustom = false;
                _isMaximizedCustom = false;
                Padding = new Padding(4);
                TopMost = _userPinnedTopMost;

                int nx = cur.X - (int)Math.Round(nw * xRatio);
                int ny = Math.Max(scr.WorkingArea.Top, cur.Y - 18);
                Bounds = ClampToWorkArea(new Rectangle(nx, ny, nw, nh), scr.WorkingArea);
                PushWindowState();
            }

            _preDragNormalBounds = Bounds;
            _isWindowMoveDrag = true;
            _dragLeftTopZone = !(wasFs || wasMax);
            _topSnapHintActive = false;

            ReleaseCapture();
            SendMessage(Handle, WM_NCLBUTTONDOWN, new IntPtr(HTCAPTION), IntPtr.Zero);
        }

        private void ToggleFullscreen()
        {
            if (_isPiPMode) ExitPiPMode();

            if (_isFullscreenCustom)
            {
                _isFullscreenCustom = false;
                TopMost = _userPinnedTopMost;
                if (_savedMaximizedBeforeFs)
                {
                    ApplyCustomMaximize();
                }
                else
                {
                    _isMaximizedCustom = false;
                    Padding = new Padding(4);
                    Bounds = _normalBounds;
                }
            }
            else
            {
                _savedMaximizedBeforeFs = _isMaximizedCustom;
                if (!_isMaximizedCustom)
                {
                    _normalBounds = Bounds;
                }
                _isMaximizedCustom = false;
                _isFullscreenCustom = true;
                Padding = Padding.Empty;
                Screen screen = Screen.FromHandle(Handle);
                Bounds = screen.Bounds;
            }

            PushWindowState();
        }

        private void OpenNativeFilesDialog()
        {
            using (OpenFileDialog dlg = new OpenFileDialog())
            {
                dlg.Title = "AETHER — 미디어, 자막 및 가사 열기";
                dlg.Multiselect = true;
                dlg.Filter =
                    "지원되는 미디어 (*.mp4;*.webm;*.mkv;*.mp3;*.mp4.part;*.webm.part;*.mkv.part;*.part)|*.mp4;*.webm;*.mkv;*.mp3;*.mp4.part;*.webm.part;*.mkv.part;*.part;*.m4v;*.mov;*.wav;*.ogg;*.flac;*.m4a|" +
                    "동영상 및 미완료 파일 (*.mp4;*.webm;*.mkv;*.mp4.part;*.webm.part;*.part)|*.mp4;*.webm;*.mkv;*.m4v;*.mov;*.mp4.part;*.webm.part;*.mkv.part;*.part|" +
                    "오디오 파일 (*.mp3;*.wav;*.ogg;*.flac;*.m4a)|*.mp3;*.wav;*.ogg;*.flac;*.m4a;*.mp3.part|" +
                    "자막 및 가사 (*.srt;*.vtt;*.lrc)|*.srt;*.vtt;*.lrc|" +
                    "모든 파일 (*.*)|*.*";

                if (dlg.ShowDialog(this) == DialogResult.OK && dlg.FileNames != null && dlg.FileNames.Length > 0)
                {
                    SendRegisteredFilesToUi(dlg.FileNames);
                }
            }
        }

        private void OpenNativeFolderDialog()
        {
            using (FolderBrowserDialog dlg = new FolderBrowserDialog())
            {
                dlg.Description = "미디어(MP4, WebM, MKV, MP3 등)가 들어있는 폴더를 선택하세요";
                if (dlg.ShowDialog(this) == DialogResult.OK && !string.IsNullOrEmpty(dlg.SelectedPath))
                {
                    List<string> found = ScanFolderMediaFiles(dlg.SelectedPath, 300);
                    if (found.Count == 0)
                    {
                        PostToast("선택한 폴더에 재생 가능한 미디어 파일이 없습니다", "warn");
                        return;
                    }
                    SendRegisteredFilesToUi(found);
                }
            }
        }

        private void OpenSavedPaths(Dictionary<string, object> msg)
        {
            object rawList;
            if (!msg.TryGetValue("paths", out rawList)) return;
            IEnumerable enumerable = rawList as IEnumerable;
            if (enumerable == null) return;

            List<string> valid = new List<string>();
            foreach (object item in enumerable)
            {
                string p = Convert.ToString(item, CultureInfo.InvariantCulture);
                if (!string.IsNullOrWhiteSpace(p) && File.Exists(p))
                {
                    valid.Add(p);
                }
            }

            if (valid.Count == 0)
            {
                PostToast("해당 파일이 이동되었거나 삭제되어 열 수 없습니다", "warn");
                return;
            }
            SendRegisteredFilesToUi(valid);
        }

        private void SaveM3uPlaylistDialog(Dictionary<string, object> msg)
        {
            object rawEntries;
            if (!msg.TryGetValue("entries", out rawEntries)) return;
            IEnumerable enumerable = rawEntries as IEnumerable;
            if (enumerable == null) return;

            List<string> lines = new List<string>();
            lines.Add("#EXTM3U");

            int count = 0;
            foreach (object obj in enumerable)
            {
                Dictionary<string, object> entry = obj as Dictionary<string, object>;
                if (entry == null) continue;
                string path = GetString(entry, "path", string.Empty);
                if (string.IsNullOrWhiteSpace(path)) continue;
                string title = GetString(entry, "title", Path.GetFileName(path));
                int dur = GetInt(entry, "duration", -1);
                lines.Add(string.Format(CultureInfo.InvariantCulture, "#EXTINF:{0},{1}", dur, title));
                lines.Add(path);
                count++;
            }

            if (count == 0)
            {
                PostToast("저장할 로컬 파일 트랙이 없습니다 (데모 트랙은 제외됩니다)", "warn");
                return;
            }

            using (SaveFileDialog dlg = new SaveFileDialog())
            {
                dlg.Title = "AETHER — 재생목록 저장 (.m3u8)";
                dlg.Filter = "M3U8 재생목록 (*.m3u8)|*.m3u8|M3U 재생목록 (*.m3u)|*.m3u";
                dlg.FileName = "AETHER-Playlist.m3u8";
                if (dlg.ShowDialog(this) == DialogResult.OK && !string.IsNullOrWhiteSpace(dlg.FileName))
                {
                    try
                    {
                        File.WriteAllLines(dlg.FileName, lines.ToArray(), new UTF8Encoding(false));
                        PostToast("재생목록 저장 완료: " + Path.GetFileName(dlg.FileName), "accent");
                    }
                    catch (Exception ex)
                    {
                        PostToast("재생목록 저장 실패: " + ex.Message, "warn");
                    }
                }
            }
        }

        private void OpenM3uPlaylistDialog()
        {
            using (OpenFileDialog dlg = new OpenFileDialog())
            {
                dlg.Title = "AETHER — 재생목록 불러오기";
                dlg.Filter = "M3U 재생목록 (*.m3u;*.m3u8)|*.m3u;*.m3u8";
                if (dlg.ShowDialog(this) != DialogResult.OK || string.IsNullOrWhiteSpace(dlg.FileName)) return;

                try
                {
                    string baseDir = Path.GetDirectoryName(dlg.FileName);
                    string[] rawLines = File.ReadAllLines(dlg.FileName, Encoding.UTF8);
                    List<string> paths = new List<string>();
                    for (int i = 0; i < rawLines.Length; i++)
                    {
                        string line = rawLines[i].Trim();
                        if (string.IsNullOrEmpty(line) || line.StartsWith("#", StringComparison.Ordinal)) continue;
                        string candidate = Path.IsPathRooted(line) ? line : Path.GetFullPath(Path.Combine(baseDir, line));
                        if (File.Exists(candidate))
                        {
                            paths.Add(candidate);
                        }
                    }
                    if (paths.Count == 0)
                    {
                        PostToast("재생목록에서 유효한 미디어 파일을 찾지 못했습니다", "warn");
                        return;
                    }
                    SendRegisteredFilesToUi(paths);
                }
                catch (Exception ex)
                {
                    PostToast("재생목록 열기 실패: " + ex.Message, "warn");
                }
            }
        }

        private void SaveScreenshotDialog(string suggestedName, string dataUrl)
        {
            if (string.IsNullOrEmpty(dataUrl)) return;
            int comma = dataUrl.IndexOf(',');
            if (comma < 0) return;

            byte[] pngBytes;
            try
            {
                pngBytes = Convert.FromBase64String(dataUrl.Substring(comma + 1));
            }
            catch
            {
                return;
            }

            using (SaveFileDialog dlg = new SaveFileDialog())
            {
                dlg.Title = "AETHER — 프레임 캡처 저장";
                dlg.Filter = "PNG 이미지 (*.png)|*.png";
                dlg.FileName = string.IsNullOrWhiteSpace(suggestedName) ? "aether-capture.png" : suggestedName;
                string pictures = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
                if (Directory.Exists(pictures)) dlg.InitialDirectory = pictures;

                if (dlg.ShowDialog(this) == DialogResult.OK && !string.IsNullOrWhiteSpace(dlg.FileName))
                {
                    try
                    {
                        File.WriteAllBytes(dlg.FileName, pngBytes);
                        PostToast("캡처 저장 완료: " + Path.GetFileName(dlg.FileName), "accent");
                    }
                    catch (Exception ex)
                    {
                        PostToast("저장 실패: " + ex.Message, "warn");
                    }
                }
            }
        }

        private void SetFileAssociation(bool enable)
        {
            try
            {
                if (enable)
                {
                    FileAssociation.Register(Application.ExecutablePath);
                    int matchedCore;
                    int totalCore;
                    FileAssociation.GetDefaultStatus(out matchedCore, out totalCore);
                    if (matchedCore < totalCore)
                    {
                        FileAssociation.OpenWindowsDefaultAppsSettings();
                        PostToast("등록 완료! 열린 Windows 설정에서 [기본값 설정]을 1번 눌러 적용하세요", "accent");
                    }
                    else
                    {
                        PostToast("AETHER가 기본 미디어 프로그램으로 등록되었습니다", "accent");
                    }
                }
                else
                {
                    FileAssociation.Unregister();
                    PostToast("탐색기 연결 프로그램 등록이 해제되었습니다", "accent");
                }
            }
            catch (Exception ex)
            {
                PostToast("연결 프로그램 설정 오류: " + ex.Message, "warn");
            }
            PushAssocState();
        }

        private void OpenDefaultAppsSettingsFromUi()
        {
            try
            {
                FileAssociation.Register(Application.ExecutablePath);
                if (FileAssociation.OpenWindowsDefaultAppsSettings())
                {
                    PostToast("Windows 설정이 열렸습니다. 상단 [기본값 설정] 버튼을 누르면 즉시 적용됩니다", "accent");
                }
                else
                {
                    PostToast("Windows 기본 앱 설정을 직접 열어 AETHER Player를 선택해 주세요", "warn");
                }
            }
            catch (Exception ex)
            {
                PostToast("기본 앱 설정 열기 오류: " + ex.Message, "warn");
            }
            PushAssocState();
        }

        private void PushAssocState()
        {
            bool reg = FileAssociation.IsRegistered(Application.ExecutablePath);
            int matchedCore;
            int totalCore;
            FileAssociation.GetDefaultStatus(out matchedCore, out totalCore);
            PostToUi(new Dictionary<string, object>
            {
                { "type", "assoc:state" },
                { "registered", reg },
                { "defaultCount", matchedCore },
                { "totalCoreCount", totalCore }
            });
        }

        private void PushUpdateConfig()
        {
            if (_updateConfig == null) _updateConfig = AutoUpdater.LoadConfig();
            PostToUi(new Dictionary<string, object>
            {
                { "type", "update:config" },
                { "currentVersion", AutoUpdater.CurrentVersion },
                { "sourceType", _updateConfig.SourceType },
                { "githubRepo", _updateConfig.GithubRepo },
                { "feedUrl", _updateConfig.FeedUrl },
                { "autoCheckOnStartup", _updateConfig.AutoCheckOnStartup },
                { "isConfigured", _updateConfig.IsConfigured() },
                { "isBuiltInSource", AutoUpdater.HasBuiltInSource() }
            });
        }

        private void SaveUpdateConfigFromUi(Dictionary<string, object> msg)
        {
            if (_updateConfig == null) _updateConfig = new UpdateConfig();
            _updateConfig.SourceType = GetString(msg, "sourceType", "github");
            _updateConfig.GithubRepo = GetString(msg, "githubRepo", string.Empty);
            _updateConfig.FeedUrl = GetString(msg, "feedUrl", string.Empty);
            _updateConfig.AutoCheckOnStartup = GetBool(msg, "autoCheckOnStartup", true);
            AutoUpdater.SaveConfig(_updateConfig);
            PushUpdateConfig();
            PostToast("업데이트 설정이 저장되었습니다", "accent");
        }

        private void ScheduleStartupUpdateCheck()
        {
            if (_updateConfig == null || !_updateConfig.AutoCheckOnStartup || !_updateConfig.IsConfigured())
            {
                return;
            }
            Task.Run(async delegate
            {
                await Task.Delay(2500).ConfigureAwait(false);
                if (!IsDisposed && IsHandleCreated)
                {
                    await RunUpdateCheckAsync(true).ConfigureAwait(false);
                }
            });
        }

        private async Task RunUpdateCheckAsync(bool silentIfUpToDate)
        {
            if (_updateConfig == null) _updateConfig = AutoUpdater.LoadConfig();
            UpdateCheckResult res = await AutoUpdater.CheckForUpdatesAsync(_updateConfig).ConfigureAwait(false);
            _latestUpdate = res;

            if (silentIfUpToDate && (!res.Success || !res.UpdateAvailable))
            {
                return;
            }

            if (!IsDisposed && IsHandleCreated)
            {
                BeginInvoke(new Action(delegate
                {
                    PostToUi(new Dictionary<string, object>
                    {
                        { "type", "update:status" },
                        { "success", res.Success },
                        { "hasConfig", res.HasConfig },
                        { "updateAvailable", res.UpdateAvailable },
                        { "currentVersion", res.CurrentVersion ?? AutoUpdater.CurrentVersion },
                        { "latestVersion", res.LatestVersion ?? string.Empty },
                        { "notes", res.Notes ?? string.Empty },
                        { "downloadUrl", res.DownloadUrl ?? string.Empty },
                        { "releaseUrl", res.ReleaseUrl ?? string.Empty },
                        { "error", res.Error ?? string.Empty },
                        { "silent", silentIfUpToDate }
                    });
                }));
            }
        }

        private async Task RunDownloadAndInstallUpdateAsync()
        {
            if (_isDownloadingUpdate) return;
            if (_latestUpdate == null || !_latestUpdate.UpdateAvailable || string.IsNullOrEmpty(_latestUpdate.DownloadUrl))
            {
                PostToast("다운로드할 최신 설치 파일 정보를 먼저 확인하세요", "warn");
                return;
            }

            _isDownloadingUpdate = true;
            try
            {
                string installerPath = await AutoUpdater.DownloadUpdateAsync(_latestUpdate, delegate(int pct, long rec, long tot)
                {
                    if (!IsDisposed && IsHandleCreated)
                    {
                        BeginInvoke(new Action(delegate
                        {
                            PostToUi(new Dictionary<string, object>
                            {
                                { "type", "update:progress" },
                                { "percent", pct },
                                { "received", rec },
                                { "total", tot }
                            });
                        }));
                    }
                }).ConfigureAwait(false);

                if (!IsDisposed && IsHandleCreated)
                {
                    BeginInvoke(new Action(delegate
                    {
                        PostToast("업데이트 설치를 위해 앱을 재시작합니다...", "accent");
                        AutoUpdater.LaunchSilentUpgrade(
                            installerPath,
                            AppDomain.CurrentDomain.BaseDirectory,
                            Process.GetCurrentProcess().Id
                        );
                        Close();
                    }));
                }
            }
            catch (Exception ex)
            {
                _isDownloadingUpdate = false;
                if (!IsDisposed && IsHandleCreated)
                {
                    BeginInvoke(new Action(delegate
                    {
                        PostToUi(new Dictionary<string, object>
                        {
                            { "type", "update:status" },
                            { "success", false },
                            { "hasConfig", true },
                            { "updateAvailable", true },
                            { "currentVersion", AutoUpdater.CurrentVersion },
                            { "latestVersion", _latestUpdate.LatestVersion ?? string.Empty },
                            { "downloadUrl", _latestUpdate.DownloadUrl ?? string.Empty },
                            { "error", ex.Message }
                        });
                        PostToast("업데이트 실패: " + ex.Message, "warn");
                    }));
                }
            }
        }

        private void SendRegisteredFilesToUi(IEnumerable<string> rawPaths)
        {
            List<string> mediaPaths = new List<string>();
            List<string> sidecarPaths = new List<string>();

            foreach (string rawPath in rawPaths)
            {
                if (string.IsNullOrWhiteSpace(rawPath) || !File.Exists(rawPath)) continue;
                string fullPath = Path.GetFullPath(rawPath);
                string ext = Path.GetExtension(fullPath).TrimStart('.').ToLowerInvariant();
                if (ext == "srt" || ext == "vtt" || ext == "lrc")
                {
                    sidecarPaths.Add(fullPath);
                }
                else if (IsMediaFile(fullPath))
                {
                    mediaPaths.Add(fullPath);
                }
            }

            List<Dictionary<string, object>> payload = new List<Dictionary<string, object>>();
            for (int i = 0; i < sidecarPaths.Count; i++)
            {
                string sp = sidecarPaths[i];
                string ext = Path.GetExtension(sp).TrimStart('.').ToLowerInvariant();
                try
                {
                    string text = ReadTextSmart(sp);
                    payload.Add(new Dictionary<string, object>
                    {
                        { "name", Path.GetFileName(sp) },
                        { "ext", ext },
                        { "isSubtitle", ext == "srt" || ext == "vtt" },
                        { "isLyrics", ext == "lrc" },
                        { "text", text }
                    });
                }
                catch { }
            }

            for (int i = 0; i < mediaPaths.Count; i++)
            {
                Dictionary<string, object> desc = BuildMediaDescriptor(mediaPaths[i]);
                if (desc != null) payload.Add(desc);
            }

            if (payload.Count > 0)
            {
                PostToUi(new Dictionary<string, object>
                {
                    { "type", "files:opened" },
                    { "files", payload },
                    { "startIndex", 0 }
                });
            }
        }

        private Dictionary<string, object> BuildMediaDescriptor(string fullPath)
        {
            string url = _mediaServer.RegisterFile(fullPath);
            if (string.IsNullOrEmpty(url)) return null;

            string name = Path.GetFileName(fullPath);
            string ext = GetCompoundExtension(name);
            long size = 0;
            try { size = new FileInfo(fullPath).Length; } catch { }

            Dictionary<string, object> dict = new Dictionary<string, object>
            {
                { "name", name },
                { "ext", ext },
                { "size", size },
                { "url", url },
                { "path", fullPath },
                { "isSubtitle", false },
                { "isLyrics", false }
            };

            // Automatically pair sibling subtitle (.srt / .vtt) and lyrics (.lrc)
            try
            {
                string dir = Path.GetDirectoryName(fullPath);
                string baseName = GetMediaBaseName(name);
                if (!string.IsNullOrEmpty(dir) && !string.IsNullOrEmpty(baseName))
                {
                    string srtPath = Path.Combine(dir, baseName + ".srt");
                    string vttPath = Path.Combine(dir, baseName + ".vtt");
                    string subPath = File.Exists(vttPath) ? vttPath : (File.Exists(srtPath) ? srtPath : null);
                    if (subPath != null && new FileInfo(subPath).Length <= 2097152)
                    {
                        dict["autoSubtitleText"] = ReadTextSmart(subPath);
                        dict["autoSubtitleExt"] = Path.GetExtension(subPath).TrimStart('.').ToLowerInvariant();
                        dict["autoSubtitleName"] = Path.GetFileName(subPath);
                    }

                    string lrcPath = Path.Combine(dir, baseName + ".lrc");
                    if (File.Exists(lrcPath) && new FileInfo(lrcPath).Length <= 1048576)
                    {
                        dict["autoLyricsText"] = ReadTextSmart(lrcPath);
                        dict["autoLyricsName"] = Path.GetFileName(lrcPath);
                    }
                }
            }
            catch { }

            return dict;
        }

        private static string ReadTextSmart(string filePath)
        {
            byte[] raw = File.ReadAllBytes(filePath);
            if (raw.Length >= 3 && raw[0] == 0xEF && raw[1] == 0xBB && raw[2] == 0xBF)
            {
                return Encoding.UTF8.GetString(raw, 3, raw.Length - 3);
            }
            if (raw.Length >= 2 && raw[0] == 0xFF && raw[1] == 0xFE)
            {
                return Encoding.Unicode.GetString(raw, 2, raw.Length - 2);
            }
            if (raw.Length >= 2 && raw[0] == 0xFE && raw[1] == 0xFF)
            {
                return Encoding.BigEndianUnicode.GetString(raw, 2, raw.Length - 2);
            }
            // Try strict UTF-8 first, fallback to system ANSI (CP949 on Korean Windows) for older .srt/.lrc
            try
            {
                UTF8Encoding strictUtf8 = new UTF8Encoding(false, true);
                return strictUtf8.GetString(raw);
            }
            catch
            {
                return Encoding.Default.GetString(raw);
            }
        }

        private static List<string> ScanFolderMediaFiles(string folder, int maxFiles)
        {
            List<string> results = new List<string>();
            if (string.IsNullOrEmpty(folder) || !Directory.Exists(folder)) return results;

            try
            {
                string[] all = Directory.GetFiles(folder);
                for (int i = 0; i < all.Length; i++)
                {
                    if (IsMediaFile(all[i]))
                    {
                        results.Add(Path.GetFullPath(all[i]));
                    }
                }
                results.Sort(delegate(string a, string b)
                {
                    return StrCmpLogicalW(Path.GetFileName(a), Path.GetFileName(b));
                });
                if (results.Count > maxFiles)
                {
                    results.RemoveRange(maxFiles, results.Count - maxFiles);
                }
            }
            catch { }
            return results;
        }

        private static bool IsMediaFile(string path)
        {
            string lower = Path.GetFileName(path).ToLowerInvariant();
            for (int i = 0; i < MediaExts.Length; i++)
            {
                if (lower.EndsWith(MediaExts[i], StringComparison.Ordinal)) return true;
            }
            return false;
        }

        private static string GetCompoundExtension(string fileName)
        {
            string lower = (fileName ?? string.Empty).ToLowerInvariant();
            string[] compounds = new[] { ".mp4.part", ".webm.part", ".mkv.part", ".m4v.part", ".mp3.part" };
            for (int i = 0; i < compounds.Length; i++)
            {
                if (lower.EndsWith(compounds[i], StringComparison.Ordinal))
                {
                    return compounds[i].Substring(1);
                }
            }
            return Path.GetExtension(lower).TrimStart('.');
        }

        private static string GetMediaBaseName(string fileName)
        {
            string ext = GetCompoundExtension(fileName);
            if (!string.IsNullOrEmpty(ext) && fileName.Length > ext.Length + 1)
            {
                return fileName.Substring(0, fileName.Length - ext.Length - 1);
            }
            return Path.GetFileNameWithoutExtension(fileName);
        }

        private void PushWindowState()
        {
            PostToUi(new Dictionary<string, object>
            {
                { "type", "window:state" },
                { "isPiP", _isPiPMode },
                { "isGhost", _isGhostMode },
                { "isTopMost", _userPinnedTopMost },
                { "isMaximized", _isMaximizedCustom },
                { "isFullscreen", _isFullscreenCustom },
                { "opacity", _pipOpacity },
                { "globalHotkeysEnabled", _globalHotkeysEnabled },
                { "appVersion", AppVersion }
            });
        }

        private void PostToast(string text, string tone)
        {
            PostToUi(new Dictionary<string, object>
            {
                { "type", "toast" },
                { "text", text },
                { "tone", tone }
            });
        }

        private void PostToUi(Dictionary<string, object> data)
        {
            if (!_webViewReady || !_uiReady || _webView == null || _webView.CoreWebView2 == null)
            {
                return;
            }
            try
            {
                string json = _json.Serialize(data);
                _webView.CoreWebView2.PostWebMessageAsJson(json);
            }
            catch { }
        }

        private void SetGlobalHotkeysEnabled(bool enabled)
        {
            _globalHotkeysEnabled = enabled;
            if (!IsHandleCreated) return;
            UnregisterGlobalHotkeys();
            if (enabled) RegisterGlobalHotkeys();
            PushWindowState();
        }

        private void RegisterGlobalHotkeys()
        {
            try
            {
                RegisterHotKey(Handle, HOTKEY_PIP_ID, MOD_ALT | MOD_SHIFT, (uint)Keys.P);
                RegisterHotKey(Handle, HOTKEY_PLAY_ID, MOD_ALT | MOD_SHIFT, (uint)Keys.Space);
                RegisterHotKey(Handle, HOTKEY_GHOST_ID, MOD_ALT | MOD_SHIFT, (uint)Keys.G);
            }
            catch { }
        }

        private void UnregisterGlobalHotkeys()
        {
            try
            {
                UnregisterHotKey(Handle, HOTKEY_PIP_ID);
                UnregisterHotKey(Handle, HOTKEY_PLAY_ID);
                UnregisterHotKey(Handle, HOTKEY_GHOST_ID);
            }
            catch { }
        }

        private void RestoreIfMinimized()
        {
            if (WindowState == FormWindowState.Minimized)
            {
                WindowState = FormWindowState.Normal;
            }
        }

        private void RestoreAndActivate()
        {
            Show();
            RestoreIfMinimized();
            Activate();
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_HOTKEY)
            {
                int id = m.WParam.ToInt32();
                if (id == HOTKEY_PIP_ID)
                {
                    if (_isGhostMode) SetGhostMode(false);
                    RestoreIfMinimized();
                    PostToUi(new Dictionary<string, object> { { "type", "hotkey:pip" } });
                }
                else if (id == HOTKEY_PLAY_ID)
                {
                    PostToUi(new Dictionary<string, object> { { "type", "hotkey:play" } });
                }
                else if (id == HOTKEY_GHOST_ID)
                {
                    RestoreIfMinimized();
                    PostToUi(new Dictionary<string, object> { { "type", "hotkey:ghost" } });
                }
                return;
            }

            if (m.Msg == WM_SIZING)
            {
                if (_isPiPMode && _pipLockAspect && _pipAspectRatio > 0.1)
                {
                    RECT rect = (RECT)Marshal.PtrToStructure(m.LParam, typeof(RECT));
                    Screen scr = Screen.FromHandle(Handle);
                    RECT adjusted = AdjustRectForAspect(rect, m.WParam.ToInt32(), _pipAspectRatio, scr.WorkingArea, PipFrameExtraX, PipFrameExtraY);
                    Marshal.StructureToPtr(adjusted, m.LParam, true);
                    m.Result = new IntPtr(1);
                    return;
                }
            }

            if (m.Msg == WM_MOVING)
            {
                if (_isWindowMoveDrag && !_isPiPMode && !_isFullscreenCustom)
                {
                    Point cur = Cursor.Position;
                    Screen scr = Screen.FromPoint(cur);
                    if (cur.Y > scr.Bounds.Top + 28)
                    {
                        _dragLeftTopZone = true;
                    }
                    bool atTop = _dragLeftTopZone && (cur.Y <= scr.Bounds.Top + 10);
                    if (atTop != _topSnapHintActive)
                    {
                        _topSnapHintActive = atTop;
                        PostToUi(new Dictionary<string, object>
                        {
                            { "type", "window:topSnapHint" },
                            { "active", atTop }
                        });
                    }
                }
            }

            if (m.Msg == WM_EXITSIZEMOVE)
            {
                base.WndProc(ref m);
                if (_topSnapHintActive)
                {
                    _topSnapHintActive = false;
                    PostToUi(new Dictionary<string, object>
                    {
                        { "type", "window:topSnapHint" },
                        { "active", false }
                    });
                }

                if (_isPiPMode)
                {
                    _savedPiPBounds = Bounds;
                    _hasSavedPiPBounds = true;
                }
                else if (_isWindowMoveDrag && !_isFullscreenCustom)
                {
                    Point cur = Cursor.Position;
                    Screen scr = Screen.FromPoint(cur);
                    if (_dragLeftTopZone && cur.Y <= scr.Bounds.Top + 10)
                    {
                        if (_preDragNormalBounds.Width >= 760 && _preDragNormalBounds.Height >= 480)
                        {
                            _normalBounds = ClampToWorkArea(_preDragNormalBounds, scr.WorkingArea);
                        }
                        _savedMaximizedBeforeFs = false;
                        _isMaximizedCustom = false;
                        _isFullscreenCustom = true;
                        Padding = Padding.Empty;
                        Bounds = scr.Bounds;
                        PushWindowState();
                    }
                    else if (!_isMaximizedCustom)
                    {
                        _normalBounds = Bounds;
                    }
                }

                _isWindowMoveDrag = false;
                _dragLeftTopZone = false;
                return;
            }

            if (m.Msg == WM_NCHITTEST)
            {
                base.WndProc(ref m);
                if ((int)m.Result == 1 && !_isMaximizedCustom && !_isFullscreenCustom && !_isGhostMode)
                {
                    long lp = m.LParam.ToInt64();
                    Point screenPos = new Point((short)(lp & 0xFFFF), (short)((lp >> 16) & 0xFFFF));
                    Point pos = PointToClient(screenPos);
                    int grip = 8;
                    bool left = pos.X <= grip;
                    bool right = pos.X >= ClientSize.Width - grip;
                    bool top = pos.Y <= grip;
                    bool bottom = pos.Y >= ClientSize.Height - grip;

                    if (top && left) m.Result = new IntPtr(HTTOPLEFT);
                    else if (top && right) m.Result = new IntPtr(HTTOPRIGHT);
                    else if (bottom && left) m.Result = new IntPtr(HTBOTTOMLEFT);
                    else if (bottom && right) m.Result = new IntPtr(HTBOTTOMRIGHT);
                    else if (left) m.Result = new IntPtr(HTLEFT);
                    else if (right) m.Result = new IntPtr(HTRIGHT);
                    else if (top) m.Result = new IntPtr(HTTOP);
                    else if (bottom) m.Result = new IntPtr(HTBOTTOM);
                }
                return;
            }

            base.WndProc(ref m);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            SetGhostMode(false);
            UnregisterGlobalHotkeys();
            _pipeCts.Cancel();
            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
                _trayIcon = null;
            }
            _mediaServer.Dispose();
            base.OnFormClosing(e);
        }

        private static Rectangle ComputeCornerRect(Rectangle work, int width, int height, string corner)
        {
            int margin = 22;
            int x = work.Right - width - margin;
            int y = work.Bottom - height - margin;

            string c = (corner ?? "br").ToLowerInvariant();
            if (c == "tl") { x = work.Left + margin; y = work.Top + margin; }
            else if (c == "tr") { x = work.Right - width - margin; y = work.Top + margin; }
            else if (c == "bl") { x = work.Left + margin; y = work.Bottom - height - margin; }

            return ClampToWorkArea(new Rectangle(x, y, width, height), work);
        }

        private static Rectangle ClampToWorkArea(Rectangle rect, Rectangle work)
        {
            int w = Math.Min(rect.Width, work.Width);
            int h = Math.Min(rect.Height, work.Height);
            int x = Math.Max(work.Left, Math.Min(rect.Left, work.Right - w));
            int y = Math.Max(work.Top, Math.Min(rect.Top, work.Bottom - h));
            return new Rectangle(x, y, w, h);
        }

        private static int ClampInt(int val, int min, int max)
        {
            if (max < min) return min;
            return Math.Max(min, Math.Min(val, max));
        }

        private static double ClampDouble(double val, double min, double max)
        {
            if (double.IsNaN(val)) return max;
            return Math.Max(min, Math.Min(val, max));
        }

        private static string GetString(Dictionary<string, object> dict, string key, string fallback)
        {
            object val;
            if (dict.TryGetValue(key, out val) && val != null) return Convert.ToString(val, CultureInfo.InvariantCulture);
            return fallback;
        }

        private static bool GetBool(Dictionary<string, object> dict, string key, bool fallback)
        {
            object val;
            if (dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToBoolean(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }

        private static int GetInt(Dictionary<string, object> dict, string key, int fallback)
        {
            object val;
            if (dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToInt32(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }

        private static double GetDouble(Dictionary<string, object> dict, string key, double fallback)
        {
            object val;
            if (dict.TryGetValue(key, out val) && val != null)
            {
                try { return Convert.ToDouble(val, CultureInfo.InvariantCulture); } catch { }
            }
            return fallback;
        }
    }
}
