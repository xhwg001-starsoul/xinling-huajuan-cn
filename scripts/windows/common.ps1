$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DefaultDataRoot = "C:\ProgramData\XinlingHuajuan"
$DefaultConfigDir = Join-Path $DefaultDataRoot "config"
$DefaultAppEnvPath = Join-Path $DefaultConfigDir "app.env"

function Get-Zh {
  param([string]$Base64)
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Base64))
}

function Normalize-XinlingDataRoot {
  param([string]$Value)
  $candidate = if ($Value) { $Value.Trim() } else { "" }
  $candidate = $candidate.Trim([char]34).Trim([char]39).Trim()
  if ([string]::IsNullOrWhiteSpace($candidate)) { return $DefaultDataRoot }
  if (![System.IO.Path]::IsPathRooted($candidate) -or $candidate -notmatch '^[A-Za-z]:\\') {
    throw "data_directory_must_be_windows_absolute_path"
  }
  return [System.IO.Path]::GetFullPath($candidate)
}

function Read-XinlingEnvFile {
  param([string]$Path)
  $map = @{}
  if (Test-Path $Path) {
    foreach ($line in Get-Content -LiteralPath $Path) {
      if ($line -match '^\s*([^#][^=]+)=(.*)$') { $map[$matches[1].Trim()] = $matches[2].Trim() }
    }
  }
  return $map
}

$ExistingDefaultEnv = Read-XinlingEnvFile $DefaultAppEnvPath
$InitialDataRoot = if ($env:XINLING_DATA_DIR) {
  $env:XINLING_DATA_DIR
} elseif ($ExistingDefaultEnv.ContainsKey("XINLING_DATA_DIR")) {
  $ExistingDefaultEnv["XINLING_DATA_DIR"]
} else {
  $DefaultDataRoot
}

$DataRoot = Normalize-XinlingDataRoot $InitialDataRoot
$DatabaseDir = Join-Path $DataRoot "database"
$ConfigDir = Join-Path $DataRoot "config"
$BackupsDir = Join-Path $DataRoot "backups"
$LogsDir = Join-Path $DataRoot "logs"
$RuntimeDir = Join-Path $DataRoot "runtime"
$UpdatesDir = Join-Path $DataRoot "updates"
$AppEnvPath = Join-Path $ConfigDir "app.env"
$PidPath = Join-Path $RuntimeDir "xinling.pid"
$DefaultPort = if ($env:PORT) {
  [int]$env:PORT
} elseif ($ExistingDefaultEnv.ContainsKey("PORT") -and $ExistingDefaultEnv["PORT"] -match '^\d+$') {
  [int]$ExistingDefaultEnv["PORT"]
} else {
  4185
}
$InstallLogPath = Join-Path (Join-Path $DefaultDataRoot "logs") "install.log"

function Set-XinlingDataRoot {
  param([string]$Value)
  $script:DataRoot = Normalize-XinlingDataRoot $Value
  $script:DatabaseDir = Join-Path $script:DataRoot "database"
  $script:ConfigDir = Join-Path $script:DataRoot "config"
  $script:BackupsDir = Join-Path $script:DataRoot "backups"
  $script:LogsDir = Join-Path $script:DataRoot "logs"
  $script:RuntimeDir = Join-Path $script:DataRoot "runtime"
  $script:UpdatesDir = Join-Path $script:DataRoot "updates"
  $script:AppEnvPath = Join-Path $script:ConfigDir "app.env"
  $script:PidPath = Join-Path $script:RuntimeDir "xinling.pid"
}

function Get-SafeErrorSummary {
  param($ErrorRecord)
  $text = if ($ErrorRecord -and $ErrorRecord.Exception) { $ErrorRecord.Exception.Message } else { [string]$ErrorRecord }
  if (!$text) { return "unknown_error" }
  $text = $text -replace '(?i)(api[_-]?key|secret|token|password|init[_-]?code)\s*=\s*[^;\s]+', '$1=[redacted]'
  $text = $text -replace '(?i)(Bearer\s+)[A-Za-z0-9._~+/-]+=*', '$1[redacted]'
  if ($text.Length -gt 500) { $text = $text.Substring(0, 500) }
  return $text
}

function Write-InstallLog {
  param([string]$Stage, [string]$Message)
  try {
    $logDir = Split-Path -Parent $InstallLogPath
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $safe = Get-SafeErrorSummary $Message
    $line = "$(Get-Date -Format o) [$Stage] $safe"
    Add-Content -LiteralPath $InstallLogPath -Value $line -Encoding UTF8
  } catch {
  }
}

function Fail-XinlingStage {
  param([string]$Stage, [string]$ChineseMessage, $ErrorRecord = $null)
  $summary = Get-SafeErrorSummary $ErrorRecord
  Write-InstallLog $Stage $summary
  Write-Host "$Stage"
  Write-Host $ChineseMessage
  if ($summary) { Write-Host "$(Get-Zh '5a6J5YWo6ZSZ6K+v5pGY6KaB'): $summary" }
  throw $Stage
}

function Ensure-XinlingDirs {
  foreach ($dir in @($DataRoot, $DatabaseDir, $ConfigDir, $BackupsDir, $LogsDir, $RuntimeDir, $UpdatesDir)) {
    try {
      New-Item -ItemType Directory -Force -Path $dir | Out-Null
    } catch {
      Fail-XinlingStage "data_directory_create_failed" (Get-Zh "5peg5rOV5Yib5bu65pWw5o2u55uu5b2V77yM6K+35qOA5p+l6Lev5b6E5ZKM5p2D6ZmQ44CC") $_
    }
  }
  try {
    $testFile = Join-Path $RuntimeDir ("write-test-" + [Guid]::NewGuid().ToString("N") + ".tmp")
    Set-Content -LiteralPath $testFile -Value "ok" -Encoding UTF8
    Remove-Item -LiteralPath $testFile -Force
  } catch {
    Fail-XinlingStage "data_directory_not_writable" (Get-Zh "5pWw5o2u55uu5b2V5LiN5Y+v5YaZ77yM6K+35o2i5LiA5Liq55uu5b2V5oiW5L2/55So566h55CG5ZGY5p2D6ZmQ6L+Q6KGM44CC") $_
  }
}

function Get-XinlingPid {
  if (!(Test-Path $PidPath)) { return $null }
  $value = (Get-Content $PidPath -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($value -match '^\d+$') { return [int]$value }
  return $null
}

function Test-XinlingProcess($PidValue) {
  if (!$PidValue) { return $false }
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$PidValue"
    if (!$proc) { return $false }
    return ($proc.CommandLine -like "*local-server.js*" -and $proc.CommandLine -like "*$ProjectRoot*")
  } catch {
    return $false
  }
}

function Test-XinlingProcessExists($PidValue) {
  if (!$PidValue) { return $false }
  try {
    $proc = Get-Process -Id $PidValue -ErrorAction Stop
    return $null -ne $proc
  } catch {
    return $false
  }
}

function Get-XinlingPortListenerPid {
  param([int]$Port = $DefaultPort)
  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
      Select-Object -First 1
    if ($connection -and $connection.OwningProcess) { return [int]$connection.OwningProcess }
  } catch {
  }
  try {
    $lines = netstat -ano -p tcp | Select-String -Pattern "LISTENING"
    foreach ($line in $lines) {
      $text = [string]$line
      if ($text -match "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") {
        return [int]$matches[1]
      }
    }
  } catch {
  }
  return $null
}

function Test-XinlingHealth {
  param([int]$Port = $DefaultPort)
  try {
    $result = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5
    if ($result.status -eq "ok" -and ($result.application -eq "xinling-huajuan-cn" -or ($result.version -and $result.database -eq "ok"))) { return "ok" }
    return "not_ok"
  } catch {
    return "not_ok_or_not_running"
  }
}

function Get-XinlingHealthInfo {
  param([int]$Port = $DefaultPort)
  try {
    $result = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5
    if ($result.status -eq "ok" -and ($result.application -eq "xinling-huajuan-cn" -or ($result.version -and $result.database -eq "ok"))) { return $result }
  } catch {
  }
  return $null
}

function Get-XinlingCommandLineValidation {
  param([int]$PidValue)
  if (!$PidValue) { return "not_checked" }
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$PidValue" -ErrorAction Stop
    if (!$proc) { return "process_not_found" }
    if (!$proc.CommandLine) { return "unavailable" }
    if ($proc.CommandLine -like "*local-server.js*") { return "matched" }
    return "mismatch"
  } catch {
    return "unavailable"
  }
}

function Get-XinlingRuntimeStatus {
  param(
    [int]$Port = $DefaultPort,
    [switch]$RecoverPidFile
  )
  $pidFileExists = Test-Path -LiteralPath $PidPath
  $pidValue = Get-XinlingPid
  $processExists = Test-XinlingProcessExists $pidValue
  $portListenerPid = Get-XinlingPortListenerPid $Port
  $healthResult = Test-XinlingHealth $Port
  $healthInfo = Get-XinlingHealthInfo $Port
  $listenerValidation = Get-XinlingCommandLineValidation $portListenerPid
  $strongHealthIdentity = [bool]($healthInfo -and $healthInfo.application -eq "xinling-huajuan-cn")
  $pidSource = if ($pidValue) { "pid-file" } else { "none" }

  if ($RecoverPidFile -and (!$pidValue -or !$processExists -or $portListenerPid -ne $pidValue) -and $portListenerPid -and $healthResult -eq "ok" -and ($strongHealthIdentity -or $listenerValidation -eq "matched")) {
    try {
      Set-Content -LiteralPath $PidPath -Value $portListenerPid -Encoding ASCII
      $pidValue = $portListenerPid
      $pidFileExists = $true
      $processExists = Test-XinlingProcessExists $pidValue
      $pidSource = "recovered-from-port"
    } catch {
      $pidSource = "port-detected-write-failed"
    }
  }

  $portMatchesPid = [bool]($pidValue -and $portListenerPid -and ([int]$portListenerPid -eq [int]$pidValue))
  $commandLineValidation = Get-XinlingCommandLineValidation $pidValue
  $running = [bool]($processExists -and $portMatchesPid -and $healthResult -eq "ok" -and ($strongHealthIdentity -or $commandLineValidation -in @("matched", "unavailable")))

  return [pscustomobject]@{
    Running = $running
    PidFilePath = $PidPath
    PidFileExists = $pidFileExists
    PidValue = $pidValue
    PidSource = $pidSource
    ProcessExists = $processExists
    Port = $Port
    PortListenerPid = $portListenerPid
    PortMatchesPid = $portMatchesPid
    HealthResult = $healthResult
    CommandLineValidation = $commandLineValidation
  }
}

function Get-LanIPv4 {
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -ExpandProperty IPAddress -Unique
}

function Test-Health($Port = $DefaultPort) {
  try {
    $result = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5
    return $result.status -eq "ok" -and ($result.application -eq "xinling-huajuan-cn" -or ($result.version -and $result.database -eq "ok"))
  } catch {
    return $false
  }
}

function Write-SafeStatus {
  param([string]$Message)
  Write-Host $Message
}
