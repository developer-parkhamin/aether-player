$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $csc)) {
    throw "C# compiler not found at $csc"
}

$coreDll = Join-Path $root "Microsoft.Web.WebView2.Core.dll"
$winformsDll = Join-Path $root "Microsoft.Web.WebView2.WinForms.dll"
$loaderDll = Join-Path $root "WebView2Loader.dll"
$iconPath = Join-Path $root "assets\aether.ico"
$manifestPath = Join-Path $root "assets\dpi.manifest"
$outExe = Join-Path $root "AETHER Player.exe"

foreach ($req in @($coreDll, $winformsDll, $loaderDll, $iconPath, $manifestPath)) {
    if (-not (Test-Path $req)) {
        throw "Required build input missing: $req"
    }
}

$srcFiles = @(
    (Join-Path $root "src\AppConfig.cs"),
    (Join-Path $root "src\Program.cs"),
    (Join-Path $root "src\MediaServer.cs"),
    (Join-Path $root "src\FileAssociation.cs"),
    (Join-Path $root "src\AutoUpdater.cs"),
    (Join-Path $root "src\MainForm.cs")
)

$argsList = @(
    "/nologo",
    "/platform:x64",
    "/target:winexe",
    "/optimize+",
    "/out:$outExe",
    "/win32icon:$iconPath",
    "/win32manifest:$manifestPath",
    "/r:System.dll",
    "/r:System.Core.dll",
    "/r:System.Drawing.dll",
    "/r:System.Windows.Forms.dll",
    "/r:System.Web.Extensions.dll",
    "/r:$coreDll",
    "/r:$winformsDll"
) + $srcFiles

Write-Host "[AETHER] Building $outExe ..."
& $csc @argsList
if ($LASTEXITCODE -ne 0) {
    throw "csc.exe failed with exit code $LASTEXITCODE"
}

Write-Host "[AETHER] Build succeeded: $outExe"
