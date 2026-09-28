using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace RenEndustriyel.Desktop
{
    static class Program
    {
        private const string AppUrl = "https://renendustriyel.vercel.app";
        private const string AppName = "Ren Endüstriyel · Ön Muhasebe";

        [STAThread]
        static void Main()
        {
            try
            {
                string edgePath = FindBrowserPath();
                if (string.IsNullOrEmpty(edgePath) || !File.Exists(edgePath))
                {
                    // Fallback to default system browser
                    Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true });
                    return;
                }

                // Dedicated profile directory in %LOCALAPPDATA%\RenEndustriyel\Profile
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string profileDir = Path.Combine(localAppData, "RenEndustriyel", "Profile");
                if (!Directory.Exists(profileDir))
                {
                    Directory.CreateDirectory(profileDir);
                }

                // Launch in standalone application window mode with isolated offline cache
                string arguments = string.Format(
                    "--app=\"{0}\" " +
                    "--user-data-dir=\"{1}\" " +
                    "--window-size=1366,850 " +
                    "--disable-features=Translate " +
                    "--enable-features=OverlayScrollbar " +
                    "--no-first-run " +
                    "--no-default-browser-check",
                    AppUrl,
                    profileDir
                );

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = edgePath,
                    Arguments = arguments,
                    UseShellExecute = false,
                    WorkingDirectory = profileDir
                };

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Uygulama başlatılırken bir sorun oluştu:\n" + ex.Message,
                    AppName,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static string FindBrowserPath()
        {
            // 1. Try registry for Edge
            try
            {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"))
                {
                    if (key != null)
                    {
                        object val = key.GetValue("");
                        if (val != null && File.Exists(val.ToString()))
                            return val.ToString();
                    }
                }
            }
            catch {}

            // 2. Standard Edge paths
            string[] candidatePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string path in candidatePaths)
            {
                if (File.Exists(path))
                    return path;
            }

            return null;
        }
    }
}
