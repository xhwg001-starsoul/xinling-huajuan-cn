. "$PSScriptRoot\common.ps1"
$before = Get-XinlingRuntimeStatus -Port $DefaultPort -RecoverPidFile
$oldPid = $before.PidValue
& "$PSScriptRoot\stop.ps1"
if ($LASTEXITCODE -ne 0) {
  Write-SafeStatus "restart_stop_failed: Existing service could not be stopped safely."
  exit 1
}
for ($i = 0; $i -lt 20; $i++) {
  if (!(Get-XinlingPortListenerPid $DefaultPort)) { break }
  Start-Sleep -Milliseconds 250
}
if (Get-XinlingPortListenerPid $DefaultPort) {
  Write-SafeStatus "restart_port_not_released: Port $DefaultPort is still listening."
  exit 1
}
& "$PSScriptRoot\start.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$after = Get-XinlingRuntimeStatus -Port $DefaultPort -RecoverPidFile
if (!$after.Running -or !$after.PidValue -or ($oldPid -and $after.PidValue -eq $oldPid)) {
  Write-SafeStatus "restart_validation_failed: New listener was not verified."
  exit 1
}
$healthInfo = Get-XinlingHealthInfo $DefaultPort
Write-SafeStatus "Restart verified. New PID: $($after.PidValue)"
Write-SafeStatus "Server started at: $($healthInfo.serverStartedAt)"
Write-SafeStatus "Runtime version: $($healthInfo.runtimeVersion)"
