. "$PSScriptRoot\common.ps1"
Ensure-XinlingDirs

$pkg = Get-Content (Join-Path $ProjectRoot "package.json") | ConvertFrom-Json
$state = Get-XinlingRuntimeStatus -Port $DefaultPort -RecoverPidFile

Write-SafeStatus "Running: $($state.Running)"
Write-SafeStatus "PID: $(if ($state.Running -or $state.PidValue) { $state.PidValue } else { '-' })"
Write-SafeStatus "PID source: $($state.PidSource)"
Write-SafeStatus "Version: $($pkg.version)"
Write-SafeStatus "Port: $DefaultPort"
Write-SafeStatus "Local URL: http://127.0.0.1:$DefaultPort"
foreach ($ip in (Get-LanIPv4)) { Write-SafeStatus "LAN URL: http://$ip`:$DefaultPort" }
Write-SafeStatus "Data root: $DataRoot"
Write-SafeStatus "Logs: $LogsDir"

$latest = Get-ChildItem -Path (Join-Path $BackupsDir "database") -Filter "xinling-db-*.db" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
Write-SafeStatus "Latest backup: $(if ($latest) { $latest.LastWriteTime } else { 'none' })"

Write-SafeStatus "Health: $($state.HealthResult)"
Write-SafeStatus "PID file path: $($state.PidFilePath)"
Write-SafeStatus "PID file exists: $($state.PidFileExists)"
Write-SafeStatus "PID file value: $(if ($state.PidValue) { $state.PidValue } else { '-' })"
Write-SafeStatus "Process exists: $($state.ProcessExists)"
Write-SafeStatus "Port listener PID: $(if ($state.PortListenerPid) { $state.PortListenerPid } else { '-' })"
Write-SafeStatus "Command-line validation result: $($state.CommandLineValidation)"
