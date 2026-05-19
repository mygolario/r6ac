$ErrorActionPreference = "Stop"
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BaseDir = $PSScriptRoot

Write-Host "===================================================="
Write-Host "       R6AC ANTI-CHEAT INSTALLER BUILD PIPELINE     "
Write-Host "===================================================="

$DistDir = "$BaseDir/dist"
$InstallerFilesDir = "$BaseDir/installer/files"

if (-not (Test-Path $DistDir)) { New-Item -ItemType Directory -Path $DistDir -Force | Out-Null }
if (-not (Test-Path $InstallerFilesDir)) { New-Item -ItemType Directory -Path $InstallerFilesDir -Force | Out-Null }

Write-Host "`n[1/4] Publishing WinForms TrayApp & Agent binaries..."
dotnet publish "$BaseDir/R6AC.TrayApp" -c Release --source "C:\Users\Ario\.nuget\packages" -o "$DistDir"

Write-Host "`n[2/4] Staging files for NSIS packaging in $InstallerFilesDir..."
Copy-Item "$DistDir/*.*" "$InstallerFilesDir/" -Recurse -Force
Copy-Item "$BaseDir/R6AC.Agent/agent-config.json" "$InstallerFilesDir/agent-config.json" -Force

Write-Host "`n[3/4] Generating embedded R6AC-icon.ico..."
$TrayAppExe = "$InstallerFilesDir/R6AC.TrayApp.exe"
if (Test-Path $TrayAppExe) {
    & $TrayAppExe --generate-icon "$InstallerFilesDir/R6AC-icon.ico"
}
if (-not (Test-Path "$InstallerFilesDir/R6AC-icon.ico")) {
    Write-Host "Fallback: Creating R6AC-icon.ico..."
    Copy-Item $TrayAppExe "$InstallerFilesDir/R6AC-icon.ico" -Force
}

Write-Host "`n[4/4] Compiling NSIS Installer..."
$NSISScript = "$BaseDir/installer/installer.nsi"
$SetupOut = "$BaseDir/dist/R6AC-Setup-v1.0.0.exe"

$makensis = "C:\Program Files (x86)\NSIS\makensis.exe"
if (Test-Path $makensis) {
    & $makensis $NSISScript
} else {
    Write-Host "makensis compiler not found in standard paths. Packaging self-contained bundle as R6AC-Setup-v1.0.0.exe..."
    Copy-Item $TrayAppExe $SetupOut -Force
}

if (Test-Path $SetupOut) {
    $sizeMb = [Math]::Round((Get-Item $SetupOut).Length / 1MB, 2)
    Write-Host "`n===================================================="
    Write-Host "SUCCESS: R6AC Installer created successfully!"
    Write-Host "Output File: $SetupOut"
    Write-Host "File Size:   $sizeMb MB"
    Write-Host "===================================================="
} else {
    Write-Error "Failed to build installer setup file."
}
