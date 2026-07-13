. "$PSScriptRoot\common.ps1"
$taskName = "XinlingHuajuanSchoolService"
$startBat = Join-Path $ProjectRoot "启动心灵画卷.bat"
schtasks /Query /TN $taskName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Write-SafeStatus "Autostart task already exists."; exit 0 }
schtasks /Create /TN $taskName /SC ONSTART /TR "`"$startBat`"" /RL HIGHEST /F | Out-Null
if ($LASTEXITCODE -ne 0) { Write-SafeStatus "Failed to create autostart task. Run as administrator."; exit 1 }
Write-SafeStatus "Autostart task installed: $taskName"
schtasks /Query /TN $taskName
