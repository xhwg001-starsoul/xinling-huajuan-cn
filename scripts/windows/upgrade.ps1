. "$PSScriptRoot\common.ps1"
param([string]$PackagePath)
if (!$PackagePath) { $PackagePath = Read-Host "Path to local update ZIP" }
if (!(Test-Path $PackagePath) -or [IO.Path]::GetExtension($PackagePath) -ne ".zip") { Write-SafeStatus "update_package_invalid"; exit 1 }
if ((Get-Item $PackagePath).Length -gt 500MB) { Write-SafeStatus "update_package_invalid: too large"; exit 1 }
Ensure-XinlingDirs
& "$PSScriptRoot\backup-database.ps1"
if ($LASTEXITCODE -ne 0) { Write-SafeStatus "Pre-upgrade database backup failed."; exit 1 }
$codeBackup = Join-Path $UpdatesDir ("code-before-upgrade-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force -Path $codeBackup | Out-Null
Copy-Item -Path (Join-Path $ProjectRoot "*") -Destination $codeBackup -Recurse -Force -Exclude ".git","node_modules","data","release"
$temp = Join-Path $UpdatesDir ("unpack-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $temp | Out-Null
Expand-Archive -Path $PackagePath -DestinationPath $temp -Force
foreach ($bad in @(".env",".env.local","app.env","data","database","backups","logs","runtime")) {
  if (Test-Path (Join-Path $temp $bad)) { Remove-Item -Recurse -Force $temp; Write-SafeStatus "update_package_invalid: forbidden content $bad"; exit 1 }
}
Write-SafeStatus "Update package passed basic checks."
Write-SafeStatus "Conservative mode: code replacement is not automatic in v0.9. Use a maintenance window."
Write-SafeStatus "Code backup: $codeBackup"
Write-SafeStatus "Unpacked package: $temp"
