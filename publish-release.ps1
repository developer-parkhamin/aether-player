param(
    [string]$Notes = "",
    [switch]$Draft
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Resolve-GhExe {
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "C:\Program Files\GitHub CLI\gh.exe",
        (Join-Path $env:LOCALAPPDATA "Programs\GitHub CLI\gh.exe")
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

$gh = Resolve-GhExe
if (-not $gh) {
    throw "GitHub CLI(gh)를 찾을 수 없습니다. 'winget install --id GitHub.cli -e'로 설치한 뒤 다시 실행하세요."
}

$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $gh auth status 2>&1 | Out-Null
$authOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap
if (-not $authOk) {
    throw "GitHub 로그인이 필요합니다. PowerShell에서 'gh auth login -h github.com -p https -w'를 먼저 실행해 주세요."
}

$cfgPath = Join-Path $root "src\AppConfig.cs"
if (-not (Test-Path $cfgPath)) {
    throw "src\AppConfig.cs 파일을 찾을 수 없습니다."
}
$cfgRaw = Get-Content -Path $cfgPath -Raw -Encoding UTF8
$version = ""
$githubRepo = ""
if ($cfgRaw -match 'Version\s*=\s*"([^"]+)"') { $version = $Matches[1].Trim() }
if ($cfgRaw -match 'UpdateGithubRepo\s*=\s*"([^"]*)"') { $githubRepo = $Matches[1].Trim() }

if ([string]::IsNullOrWhiteSpace($version)) {
    throw "src\AppConfig.cs에서 Version 상수를 읽을 수 없습니다."
}

$tag = "v$version"
Write-Host "[AETHER] Preparing release $tag ..."

# 1. Build app & installer
& (Join-Path $root "build-installer.ps1") -GithubRepo $githubRepo
if ($LASTEXITCODE -ne 0) { throw "build-installer.ps1 failed" }

$appExe = Join-Path $root "AETHER Player.exe"
$setupExe = Join-Path $root "dist\AETHER Player Setup.exe"
$latestJson = Join-Path $root "dist\latest.json"

# 2. Run verification checks before publishing
$tmpSelf = Join-Path $root "_release_selftest.txt"
$tmpVerify = Join-Path $root "_release_verify.txt"
try {
    $p1 = Start-Process -FilePath $appExe -ArgumentList "--self-test=`"$tmpSelf`"" -Wait -PassThru
    if ($p1.ExitCode -ne 0) { throw "App --self-test failed with exit code $($p1.ExitCode)" }

    $p2 = Start-Process -FilePath $setupExe -ArgumentList "--verify-payload=`"$tmpVerify`"" -Wait -PassThru
    if ($p2.ExitCode -ne 0) { throw "Installer --verify-payload failed with exit code $($p2.ExitCode)" }
}
finally {
    Remove-Item $tmpSelf, $tmpVerify -Force -ErrorAction SilentlyContinue
}

# 3. Push commits & tag to origin
$originUrl = git remote get-url origin 2>$null
if ([string]::IsNullOrWhiteSpace($originUrl)) {
    throw "Git remote 'origin'이 아직 연결되지 않았습니다. 먼저 GitHub 저장소를 생성/연결해 주세요."
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ([string]::IsNullOrWhiteSpace($branch) -or $branch -eq "HEAD") { $branch = "main" }

git push -u origin $branch
if ($LASTEXITCODE -ne 0) { throw "git push $branch failed" }

$existingTag = git tag -l $tag
if ([string]::IsNullOrWhiteSpace($existingTag)) {
    git tag $tag
    if ($LASTEXITCODE -ne 0) { throw "git tag $tag failed" }
}
git push origin $tag
if ($LASTEXITCODE -ne 0) { throw "git push tag $tag failed" }

if ([string]::IsNullOrWhiteSpace($Notes) -and (Test-Path $latestJson)) {
    try {
        $latestData = Get-Content -Path $latestJson -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($latestData -and $latestData.notes) { $Notes = [string]$latestData.notes }
    }
    catch { }
}
if ([string]::IsNullOrWhiteSpace($Notes)) {
    $Notes = "AETHER Player $tag Release"
}

# 4. Create or upload GitHub Release
$ghArgs = @("release", "create", $tag, $setupExe, $latestJson, "--title", "AETHER Player $tag", "--notes", $Notes)
if ($Draft) { $ghArgs += "--draft" }

$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $gh release view $tag 2>&1 | Out-Null
$releaseExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap

if ($releaseExists) {
    Write-Host "[AETHER] Release $tag already exists; uploading/replacing assets ..."
    & $gh release upload $tag $setupExe $latestJson --clobber
    if ($LASTEXITCODE -ne 0) { throw "gh release upload failed" }
}
else {
    Write-Host "[AETHER] Creating GitHub release $tag ..."
    & $gh @ghArgs
    if ($LASTEXITCODE -ne 0) { throw "gh release create failed" }
}

Write-Host "[AETHER] Published GitHub Release $tag cleanly!"
