param(
  [string]$DataRoot
)

if ($DataRoot) {
  $env:XINLING_DATA_DIR = $DataRoot
}

. "$PSScriptRoot\common.ps1"
Ensure-XinlingDirs

$existingPid = Get-XinlingPid
if (Test-XinlingProcess $existingPid) {
  Write-SafeStatus "Xinling Huajuan is already running. PID: $existingPid"
  exit 0
}
if ($existingPid) { Remove-Item -Force $PidPath -ErrorAction SilentlyContinue }

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

Write-SafeStatus "Xinling Huajuan started."
Write-SafeStatus "Local URL: http://127.0.0.1:$($env:PORT)"
$ips = Get-LanIPv4
foreach ($ip in $ips) { Write-SafeStatus "LAN URL: http://$ip`:$($env:PORT)" }
Write-SafeStatus "PID: $($process.Id)"
Write-SafeStatus "Port: $($env:PORT)"
Write-SafeStatus "Data root: $DataRoot"
