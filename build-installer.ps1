param(
    [string]$GithubRepo = "",
    [string]$FeedUrl = "",
    [string]$DownloadUrl = ""
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$wpfDir = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF"
$fxDir = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319"

# 1. Build main application
& (Join-Path $root "build.ps1")
if ($LASTEXITCODE -ne 0) {
    throw "Main app build failed"
}

$distDir = Join-Path $root "dist"
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

$stageDir = Join-Path $root "_installer_stage"
$payloadZip = Join-Path $root "_payload.zip"
$setupExe = Join-Path $distDir "AETHER Player Setup.exe"
$setupIcon = Join-Path $root "assets\setup.ico"
$setupBadge = Join-Path $root "assets\setup-badge.png"
$manifestPath = Join-Path $root "assets\dpi.manifest"
$xamlPath = Join-Path $root "src\InstallerWindow.xaml"

foreach ($req in @($setupIcon, $setupBadge, $manifestPath, $xamlPath)) {
    if (-not (Test-Path $req)) {
        throw "Required installer asset missing: $req"
    }
}

if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
if (Test-Path $payloadZip) { Remove-Item $payloadZip -Force }
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

Copy-Item (Join-Path $root "AETHER Player.exe") $stageDir -Force
Copy-Item (Join-Path $root "Microsoft.Web.WebView2.Core.dll") $stageDir -Force
Copy-Item (Join-Path $root "Microsoft.Web.WebView2.WinForms.dll") $stageDir -Force
Copy-Item (Join-Path $root "WebView2Loader.dll") $stageDir -Force
Copy-Item (Join-Path $root "assets") (Join-Path $stageDir "assets") -Recurse -Force
Copy-Item (Join-Path $root "ui") (Join-Path $stageDir "ui") -Recurse -Force

if (-not [string]::IsNullOrWhiteSpace($GithubRepo) -or -not [string]::IsNullOrWhiteSpace($FeedUrl)) {
    $cfgObj = @{
        sourceType = if ([string]::IsNullOrWhiteSpace($FeedUrl)) { "github" } else { "feed" }
        githubRepo = $GithubRepo
        feedUrl = $FeedUrl
        autoCheckOnStartup = $true
    }
    $cfgObj | ConvertTo-Json -Compress | Set-Content -Path (Join-Path $stageDir "update-config.json") -Encoding UTF8
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $payloadZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$srcFiles = @(
    (Join-Path $root "src\AppConfig.cs"),
    (Join-Path $root "src\Installer.cs"),
    (Join-Path $root "src\FileAssociation.cs")
)

$argsList = @(
    "/nologo",
    "/platform:x64",
    "/target:winexe",
    "/optimize+",
    "/out:$setupExe",
    "/win32icon:$setupIcon",
    "/win32manifest:$manifestPath",
    "/resource:$payloadZip,AetherPayload.zip",
    "/resource:$xamlPath,InstallerWindow.xaml",
    "/resource:$setupBadge,SetupBadge.png",
    "/r:System.dll",
    "/r:System.Core.dll",
    "/r:System.Drawing.dll",
    "/r:System.Windows.Forms.dll",
    "/r:System.IO.Compression.dll",
    "/r:System.IO.Compression.FileSystem.dll",
    "/r:$fxDir\System.Xaml.dll",
    "/r:$wpfDir\WindowsBase.dll",
    "/r:$wpfDir\PresentationCore.dll",
    "/r:$wpfDir\PresentationFramework.dll"
) + $srcFiles

Write-Host "[AETHER] Building WPF Installer $setupExe ..."
& $csc @argsList
if ($LASTEXITCODE -ne 0) {
    throw "Installer csc.exe failed with exit code $LASTEXITCODE"
}

Remove-Item $stageDir -Recurse -Force
Remove-Item $payloadZip -Force

# Generate dist/latest.json manifest using version from src/AppConfig.cs
$appCfgPath = Join-Path $root "src\AppConfig.cs"
$appVersion = "2.2.0"
if (Test-Path $appCfgPath) {
    $cfgRaw = Get-Content -Path $appCfgPath -Raw
    if ($cfgRaw -match 'Version\s*=\s*"([^"]+)"') {
        $appVersion = $Matches[1]
    }
}
$hash = (Get-FileHash -Path $setupExe -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item $setupExe).Length
$latestObj = @{
    version = $appVersion
    fileName = "AETHER Player Setup.exe"
    size = $size
    sha256 = $hash
    downloadUrl = $DownloadUrl
    notes = "AETHER Player v$appVersion - Aspect-Locked PIP Resize, Portrait Video Fit, No Auto-Queue, Top-Edge Fullscreen Snap, Default Apps Handoff"
    releasedAt = (Get-Date).ToString("o")
}
$latestObj | ConvertTo-Json -Depth 3 | Set-Content -Path (Join-Path $distDir "latest.json") -Encoding UTF8

Write-Host "[AETHER] Installer build succeeded: $setupExe"
Write-Host "[AETHER] Release manifest generated: $(Join-Path $distDir 'latest.json')"
