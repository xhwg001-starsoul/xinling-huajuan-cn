. "$PSScriptRoot\common.ps1"

$taskName = "XinlingHuajuanSchoolService"
$taskPath = [System.IO.Path]::DirectorySeparatorChar.ToString()
$taskDataRoot = "C:\ProgramData\XinlingHuajuan-Test"
$taskAppEnvPath = Join-Path $taskDataRoot "config\app.env"
$startScript = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot "scripts\windows\start.ps1"))
$powerShellExe = (Get-Command powershell.exe -ErrorAction Stop).Source
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name

if (!(Test-Path -LiteralPath $startScript)) {
  Write-SafeStatus "autostart_start_script_missing: 未找到学校启动脚本。"
  exit 1
}
if (!(Test-Path -LiteralPath $taskAppEnvPath)) {
  Write-SafeStatus "autostart_config_missing: 未找到学校模式配置文件。"
  exit 1
}

# A missing task is normal on first installation; Get-ScheduledTask suppresses that case.
$existingTask = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue
if ($existingTask) {
  Write-SafeStatus "开机自启动任务已存在，将安全更新。"
} else {
  Write-SafeStatus "未检测到开机自启动任务，开始创建。"
}

try {
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -DataRoot `"$taskDataRoot`""
  $action = New-ScheduledTaskAction -Execute $powerShellExe -Argument $arguments -WorkingDirectory $ProjectRoot
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
  $principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
} catch {
  Write-SafeStatus "autostart_task_create_failed: 无法创建开机自启动任务，请右键以管理员身份运行，并确认当前用户具有计划任务权限。"
  exit 1
}

$installedTask = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue
$installedAction = @($installedTask.Actions | Select-Object -First 1)
$actionOk = $installedAction.Count -eq 1 -and
  [System.IO.Path]::GetFullPath($installedAction[0].Execute) -ieq [System.IO.Path]::GetFullPath($powerShellExe) -and
  $installedAction[0].Arguments -like "*$startScript*" -and
  $installedAction[0].Arguments -like "*$taskDataRoot*" -and
  [System.IO.Path]::GetFullPath($installedAction[0].WorkingDirectory) -ieq [System.IO.Path]::GetFullPath($ProjectRoot)

if (!$installedTask -or $installedTask.TaskName -ne $taskName -or $installedTask.TaskPath -ne $taskPath -or !$actionOk) {
  Write-SafeStatus "autostart_task_verification_failed: 计划任务创建后验证失败。"
  exit 1
}

try {
  Start-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction Stop
} catch {
  Write-SafeStatus "autostart_task_start_failed: 计划任务无法手动启动。"
  exit 1
}

$healthy = $false
for ($i = 0; $i -lt 15; $i++) {
  if ((Test-XinlingHealth 4185)) {
    $healthy = $true
    break
  }
  Start-Sleep -Seconds 1
}

if (!$healthy) {
  Write-SafeStatus "autostart_health_check_failed: 任务已创建，但 4185 服务健康检查未通过。"
  exit 1
}

Write-SafeStatus "开机自启动任务已安装并验证：$taskName"
Write-SafeStatus "TaskPath: $taskPath"
Write-SafeStatus "WorkingDirectory: $ProjectRoot"
Write-SafeStatus "Service health: ok"
