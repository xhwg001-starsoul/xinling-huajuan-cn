. "$PSScriptRoot\common.ps1"

$taskName = "XinlingHuajuanSchoolService"
$taskPath = [System.IO.Path]::DirectorySeparatorChar.ToString()
$existingTask = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue

if (!$existingTask) {
  Write-SafeStatus "未安装开机自启动任务。"
  exit 0
}

try {
  Unregister-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Confirm:$false -ErrorAction Stop
} catch {
  Write-SafeStatus "autostart_task_remove_failed: 无法取消开机自启动任务，请右键以管理员身份运行。"
  exit 1
}

$remainingTask = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue
if ($remainingTask) {
  Write-SafeStatus "autostart_task_remove_failed: 计划任务仍然存在。"
  exit 1
}

Write-SafeStatus "开机自启动任务已取消。"
