param(
  [string]$DataRoot
)

if ($DataRoot) {
  $env:XINLING_DATA_DIR = $DataRoot
}

. "$PSScriptRoot\common.ps1"
Ensure-XinlingDirs

$existingState = Get-XinlingRuntimeStatus -Port $DefaultPort -RecoverPidFile
if ($existingState.Running) {
  $healthInfo = Get-XinlingHealthInfo $DefaultPort
  $startedAt = if ($healthInfo.serverStartedAt) { $healthInfo.serverStartedAt } else { "unknown" }
  Write-SafeStatus (Get-Zh "5pyN5Yqh5bey6L+Q6KGM77yM6K+35L2/55SocmVzdGFydOOAgg==")
  Write-SafeStatus "PID: $($existingState.PidValue)"
  Write-SafeStatus "Started at: $startedAt"
  exit 2
}
if ($existingState.PortListenerPid) {
  $listenerValidation = Get-XinlingCommandLineValidation $existingState.PortListenerPid
  if ($listenerValidation -eq "matched") {
    $processInfo = Get-Process -Id $existingState.PortListenerPid -ErrorAction SilentlyContinue
    Write-SafeStatus (Get-Zh "5pyN5Yqh5bey6L+Q6KGM77yM6K+35L2/55SocmVzdGFydOOAgg==")
    Write-SafeStatus "PID: $($existingState.PortListenerPid)"
    Write-SafeStatus "Started at: $(if ($processInfo) { $processInfo.StartTime.ToString('o') } else { 'unknown' })"
    exit 2
  }
  Write-SafeStatus "port_already_in_use: Port $DefaultPort is occupied by PID $($existingState.PortListenerPid)."
  Write-SafeStatus "The listener did not pass Xinling Huajuan health validation. Start was cancelled."
  exit 2
}
if ($existingState.PidValue) { Remove-Item -Force $PidPath -ErrorAction SilentlyContinue }

$node = Get-Command node -ErrorAction SilentlyContinue
if (!$node) {
  Write-SafeStatus "node_not_found: Please install Node.js 20 or newer."
  exit 1
}

$env:APP_MODE = "school"
$env:HOST = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "4185" }
$env:XINLING_DATA_DIR = $DataRoot

$outLog = Join-Path $LogsDir "xinling-server.out.log"
$errLog = Join-Path $LogsDir "xinling-server.err.log"
$process = Start-Process -FilePath $node.Source -ArgumentList "local-server.js" -WorkingDirectory $ProjectRoot -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden -PassThru
Set-Content -Path $PidPath -Value $process.Id -Encoding ASCII

Start-Sleep -Seconds 3
if (!(Test-Health ([int]$env:PORT))) {
  Write-SafeStatus "Health check failed. See log: $errLog"
  exit 1
}
$newState = Get-XinlingRuntimeStatus -Port ([int]$env:PORT) -RecoverPidFile
if (!$newState.Running -or $newState.PidValue -ne $process.Id) {
  Write-SafeStatus "start_validation_failed: Port listener does not match the new process."
  exit 1
}
$healthInfo = Get-XinlingHealthInfo ([int]$env:PORT)

Write-SafeStatus "Xinling Huajuan started."
Write-SafeStatus "Local URL: http://127.0.0.1:$($env:PORT)"
$ips = Get-LanIPv4
foreach ($ip in $ips) { Write-SafeStatus "LAN URL: http://$ip`:$($env:PORT)" }
Write-SafeStatus "PID: $($process.Id)"
Write-SafeStatus "Port: $($env:PORT)"
Write-SafeStatus "Data root: $DataRoot"
Write-SafeStatus "Server started at: $($healthInfo.serverStartedAt)"
Write-SafeStatus "Runtime version: $($healthInfo.runtimeVersion)"
