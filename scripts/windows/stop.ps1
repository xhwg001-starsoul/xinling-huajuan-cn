. "$PSScriptRoot\common.ps1"
Ensure-XinlingDirs

$state = Get-XinlingRuntimeStatus -Port $DefaultPort -RecoverPidFile
$targetPid = $state.PidValue
$validationOk = [bool]($targetPid -and $state.ProcessExists -and $state.PortMatchesPid -and $state.HealthResult -eq "ok" -and $state.CommandLineValidation -eq "matched")

Write-SafeStatus "Target PID: $(if ($targetPid) { $targetPid } else { '-' })"
Write-SafeStatus "PID source: $($state.PidSource)"
Write-SafeStatus "Validation result: $(if ($validationOk) { 'safe-to-stop' } else { 'not-safe-to-stop' })"

if (!$validationOk) {
  if ((!$targetPid -or !$state.ProcessExists) -and !$state.PortListenerPid -and $state.HealthResult -ne "ok") {
    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
    Write-SafeStatus "Stop attempt result: already-stopped"
    Write-SafeStatus "Port released: True"
    Write-SafeStatus "PID file removed: $([bool](!(Test-Path -LiteralPath $PidPath)))"
    exit 0
  }

  Write-SafeStatus "Stop attempt result: skipped"
  Write-SafeStatus "Port released: $([bool](!$state.PortListenerPid))"
  Write-SafeStatus "PID file removed: False"
  Write-SafeStatus "Refusing to stop because PID, port, health, and command-line validation did not all match."
  exit 1
}

$adminStopMessage = Get-Zh "5pyN5Yqh55Sx566h55CG5ZGY5p2D6ZmQ5ZCv5Yqo77yM6K+35Y+z6ZSu5Lul566h55CG5ZGY6Lqr5Lu96L+Q6KGM5YGc5q2i6ISa5pys44CC"
$normalStopResult = "not_attempted"
try {
  Stop-Process -Id $targetPid -ErrorAction Stop
  $normalStopResult = "normal-stop-sent"
} catch {
  $message = Get-SafeErrorSummary $_
  if ($message -match '(?i)access is denied|permission') {
    Write-SafeStatus "Stop attempt result: permission-denied"
    Write-SafeStatus $adminStopMessage
    Write-SafeStatus "Port released: False"
    Write-SafeStatus "PID file removed: False"
    exit 1
  }
  Write-SafeStatus "Stop attempt result: normal-stop-failed"
  Write-SafeStatus "Safe error summary: $message"
}

$exited = $false
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Milliseconds 500
  if (!(Test-XinlingProcessExists $targetPid)) {
    $exited = $true
    break
  }
}

$forceStopResult = "not_needed"
if (!$exited) {
  try {
    Stop-Process -Id $targetPid -Force -ErrorAction Stop
    $forceStopResult = "force-stop-sent"
  } catch {
    $message = Get-SafeErrorSummary $_
    if ($message -match '(?i)access is denied|permission') {
      Write-SafeStatus "Stop attempt result: permission-denied"
      Write-SafeStatus $adminStopMessage
      Write-SafeStatus "Port released: False"
      Write-SafeStatus "PID file removed: False"
      exit 1
    }
    Write-SafeStatus "Stop attempt result: force-stop-failed"
    Write-SafeStatus "Safe error summary: $message"
  }

  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 500
    if (!(Test-XinlingProcessExists $targetPid)) {
      $exited = $true
      break
    }
  }
}

$finalProcessExists = Test-XinlingProcessExists $targetPid
$finalPortPid = Get-XinlingPortListenerPid $DefaultPort
$finalHealth = Test-XinlingHealth $DefaultPort
$portReleased = [bool](!$finalPortPid)
$healthStopped = [bool]($finalHealth -ne "ok")
$pidFileRemoved = $false

if (!$finalProcessExists -and $portReleased -and $healthStopped) {
  Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
  $pidFileRemoved = !(Test-Path -LiteralPath $PidPath)
  Write-SafeStatus "Stop attempt result: success ($normalStopResult, $forceStopResult)"
  Write-SafeStatus "Port released: $portReleased"
  Write-SafeStatus "PID file removed: $pidFileRemoved"
  exit 0
}

Write-SafeStatus "Stop attempt result: failed-after-stop-attempt"
Write-SafeStatus "Process exists: $finalProcessExists"
Write-SafeStatus "Port listener PID: $(if ($finalPortPid) { $finalPortPid } else { '-' })"
Write-SafeStatus "Health: $finalHealth"
Write-SafeStatus "Port released: $portReleased"
Write-SafeStatus "PID file removed: False"
exit 1
