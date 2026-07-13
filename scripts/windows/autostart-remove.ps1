. "$PSScriptRoot\common.ps1"
$taskName = "XinlingHuajuanSchoolService"
schtasks /Query /TN $taskName 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-SafeStatus "Autostart task not found."; exit 0 }
schtasks /Delete /TN $taskName /F | Out-Null
if ($LASTEXITCODE -ne 0) { Write-SafeStatus "Failed to remove autostart task."; exit 1 }
Write-SafeStatus "Autostart task removed."
