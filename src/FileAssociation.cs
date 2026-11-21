using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace AetherPlayer
{
    internal static class FileAssociation
    {
        private const string ProgId = "AetherPlayer.Media";
        private const string AppDisplayName = "AETHER Player";
        private const string AppExeName = "AETHER Player.exe";

        private static readonly string[] Extensions = new[]
        {
            ".mp4", ".webm", ".mkv", ".mp3",
            ".m4v", ".mov", ".ogv", ".wav", ".ogg", ".flac", ".m4a", ".aac",
            ".part"
        };

        private static readonly string[] CoreExtensions = new[]
        {
            ".mp4", ".webm", ".mkv", ".mp3", ".part"
        };

        public static string[] GetRegisteredExtensions()
        {
            return (string[])Extensions.Clone();
        }

        [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

        public static bool IsRegistered(string exePath)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Classes\" + ProgId + @"\shell\open\command", false))
                {
                    if (key == null) return false;
                    object val = key.GetValue(null);
                    if (val == null) return false;
                    string cmd = val.ToString();
                    if (string.IsNullOrEmpty(exePath)) return true;
                    return cmd.IndexOf(Path.GetFullPath(exePath), StringComparison.OrdinalIgnoreCase) >= 0;
                }
            }
            catch
            {
                return false;
            }
        }

        public static void Register(string exePath)
        {
            string fullExe = Path.GetFullPath(exePath);
            string openCmd = "\"" + fullExe + "\" \"%1\"";
            string iconVal = "\"" + fullExe + "\",0";

            using (RegistryKey progKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\" + ProgId))
            {
                if (progKey != null)
                {
                    progKey.SetValue(null, "AETHER Media File");
                    progKey.SetValue("FriendlyTypeName", "AETHER Media File");
                    using (RegistryKey iconKey = progKey.CreateSubKey("DefaultIcon"))
                    {
                        if (iconKey != null) iconKey.SetValue(null, iconVal);
                    }
                    using (RegistryKey cmdKey = progKey.CreateSubKey(@"shell\open\command"))
                    {
                        if (cmdKey != null) cmdKey.SetValue(null, openCmd);
                    }
                    using (RegistryKey appInfoKey = progKey.CreateSubKey("Application"))
                    {
                        if (appInfoKey != null)
                        {
                            appInfoKey.SetValue("ApplicationName", AppDisplayName);
                            appInfoKey.SetValue("ApplicationIcon", iconVal);
                            appInfoKey.SetValue("ApplicationDescription", "AETHER Desktop PIP Media Player");
                        }
                    }
                }
            }

            using (RegistryKey appKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\" + AppExeName))
            {
                if (appKey != null)
                {
                    appKey.SetValue("FriendlyAppName", AppDisplayName);
                    using (RegistryKey iconKey = appKey.CreateSubKey("DefaultIcon"))
                    {
                        if (iconKey != null) iconKey.SetValue(null, iconVal);
                    }
                    using (RegistryKey cmdKey = appKey.CreateSubKey(@"shell\open\command"))
                    {
                        if (cmdKey != null) cmdKey.SetValue(null, openCmd);
                    }
                    using (RegistryKey suppKey = appKey.CreateSubKey("SupportedTypes"))
                    {
                        if (suppKey != null)
                        {
                            for (int i = 0; i < Extensions.Length; i++)
                            {
                                suppKey.SetValue(Extensions[i], string.Empty);
                            }
                        }
                    }
                }
            }

            using (RegistryKey capKey = Registry.CurrentUser.CreateSubKey(@"Software\AetherPlayer\Capabilities"))
            {
                if (capKey != null)
                {
                    capKey.SetValue("ApplicationName", AppDisplayName);
                    capKey.SetValue("ApplicationIcon", iconVal);
                    capKey.SetValue("ApplicationDescription", "AETHER Desktop PIP Media Player (MP4, WebM, MKV, MP3, .part)");
                    using (RegistryKey assocKey = capKey.CreateSubKey("FileAssociations"))
                    {
                        if (assocKey != null)
                        {
                            for (int i = 0; i < Extensions.Length; i++)
                            {
                                assocKey.SetValue(Extensions[i], ProgId);
                            }
                        }
                    }
                }
            }

            using (RegistryKey regApps = Registry.CurrentUser.CreateSubKey(@"Software\RegisteredApplications"))
            {
                if (regApps != null)
                {
                    regApps.SetValue(AppDisplayName, @"Software\AetherPlayer\Capabilities");
                }
            }

            for (int i = 0; i < Extensions.Length; i++)
            {
                string ext = Extensions[i];
                using (RegistryKey extRootKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\" + ext))
                {
                    if (extRootKey != null)
                    {
                        extRootKey.SetValue(null, ProgId);
                    }
                }
                using (RegistryKey extKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\" + ext + @"\OpenWithProgids"))
                {
                    if (extKey != null)
                    {
                        extKey.SetValue(ProgId, new byte[0], RegistryValueKind.None);
                    }
                }
            }

            NotifyShell();
        }

        public static void GetDefaultStatus(out int matchedCore, out int totalCore)
        {
            matchedCore = 0;
            totalCore = CoreExtensions.Length;

            for (int i = 0; i < CoreExtensions.Length; i++)
            {
                string ext = CoreExtensions[i];
                try
                {
                    string ucProg = null;
                    using (RegistryKey ucKey = Registry.CurrentUser.OpenSubKey(
                        @"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\" + ext + @"\UserChoice", false))
                    {
                        if (ucKey != null)
                        {
                            object val = ucKey.GetValue("ProgId");
                            if (val != null) ucProg = val.ToString();
                        }
                    }

                    if (!string.IsNullOrEmpty(ucProg))
                    {
                        if (string.Equals(ucProg, ProgId, StringComparison.OrdinalIgnoreCase))
                        {
                            matchedCore++;
                        }
                        continue;
                    }

                    using (RegistryKey clsKey = Registry.CurrentUser.OpenSubKey(@"Software\Classes\" + ext, false))
                    {
                        if (clsKey != null)
                        {
                            object clsVal = clsKey.GetValue(null);
                            if (clsVal != null && string.Equals(clsVal.ToString(), ProgId, StringComparison.OrdinalIgnoreCase))
                            {
                                matchedCore++;
                            }
                        }
                    }
                }
                catch { }
            }
        }

        public static bool OpenWindowsDefaultAppsSettings()
        {
            string deepUri = "ms-settings:defaultapps?registeredAppUser=" + Uri.EscapeDataString(AppDisplayName);
            try
            {
                Process.Start(new ProcessStartInfo(deepUri) { UseShellExecute = true });
                return true;
            }
            catch { }

            try
            {
                Process.Start(new ProcessStartInfo("ms-settings:defaultapps") { UseShellExecute = true });
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static void Unregister()
        {
            for (int i = 0; i < Extensions.Length; i++)
            {
                try
                {
                    using (RegistryKey extRoot = Registry.CurrentUser.OpenSubKey(@"Software\Classes\" + Extensions[i], true))
                    {
                        if (extRoot != null)
                        {
                            object cur = extRoot.GetValue(null);
                            if (cur != null && string.Equals(cur.ToString(), ProgId, StringComparison.OrdinalIgnoreCase))
                            {
                                extRoot.DeleteValue(string.Empty, false);
                            }
                        }
                    }
                }
                catch { }

                try
                {
                    using (RegistryKey extKey = Registry.CurrentUser.OpenSubKey(@"Software\Classes\" + Extensions[i] + @"\OpenWithProgids", true))
                    {
                        if (extKey != null)
                        {
                            extKey.DeleteValue(ProgId, false);
                        }
                    }
                }
                catch { }
            }

            DeleteSubKeyTreeSafe(@"Software\Classes\" + ProgId);
            DeleteSubKeyTreeSafe(@"Software\Classes\Applications\" + AppExeName);
            DeleteSubKeyTreeSafe(@"Software\AetherPlayer");

            try
            {
                using (RegistryKey regApps = Registry.CurrentUser.OpenSubKey(@"Software\RegisteredApplications", true))
                {
                    if (regApps != null)
                    {
                        regApps.DeleteValue(AppDisplayName, false);
                    }
                }
            }
            catch { }

            NotifyShell();
        }

        private static void DeleteSubKeyTreeSafe(string subKey)
        {
            try
            {
                Registry.CurrentUser.DeleteSubKeyTree(subKey, false);
            }
            catch { }
        }

        private static void NotifyShell()
        {
            try
            {
                // SHCNE_ASSOCCHANGED = 0x08000000
                SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
            }
            catch { }
        }
    }
}
