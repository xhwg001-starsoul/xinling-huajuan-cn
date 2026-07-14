. "$PSScriptRoot\common.ps1"
Ensure-XinlingDirs

function Read-ExistingEnv {
  $map = Read-XinlingEnvFile $DefaultAppEnvPath
  if ((Test-Path $AppEnvPath) -and ($AppEnvPath -ne $DefaultAppEnvPath)) {
    $custom = Read-XinlingEnvFile $AppEnvPath
    foreach ($key in $custom.Keys) { $map[$key] = $custom[$key] }
  }
  return $map
}

function Read-SecurePlainValue {
  param([string]$Prompt)
  $secure = Read-Host $Prompt -AsSecureString
  $ptr = [IntPtr]::Zero
  try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    return [Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
  } finally {
    if ($ptr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }
}

function Test-ValidAdminInitCode {
  param([string]$Value)
  return ![string]::IsNullOrWhiteSpace($Value) -and $Value.Length -ge 8
}

function Get-CnAdminPresence {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (!$node) { return "unknown" }

  $nodeScript = @'
const fs = require('node:fs');
const path = require('node:path');
let db;
try {
  const databasePath = path.join(process.env.XINLING_DATA_DIR, 'database', 'xinling-cn.db');
  if (!fs.existsSync(databasePath)) {
    process.stdout.write('no_admin');
  } else {
    const Database = require('better-sqlite3');
    db = new Database(databasePath, { readonly: true, fileMustExist: true });
    const usersTable = db.prepare('SELECT 1 FROM sqlite_master WHERE type = char(116,97,98,108,101) AND name = char(117,115,101,114,115) LIMIT 1').get();
    const admin = usersTable ? db.prepare('SELECT 1 FROM users WHERE role = ? LIMIT 1').get('admin') : null;
    process.stdout.write(admin ? 'has_admin' : 'no_admin');
  }
} catch {
  process.stdout.write('unknown');
  process.exitCode = 2;
} finally {
  if (db) db.close();
}
'@

  $hadAppMode = Test-Path Env:APP_MODE
  $previousAppMode = $env:APP_MODE
  $hadDataRoot = Test-Path Env:XINLING_DATA_DIR
  $previousDataRoot = $env:XINLING_DATA_DIR
  try {
    $env:APP_MODE = "school"
    $env:XINLING_DATA_DIR = $DataRoot
    $status = (& node -e $nodeScript | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { return "unknown" }
    if ($status -in @("has_admin", "no_admin")) { return $status }
    return "unknown"
  } finally {
    if ($hadAppMode) { $env:APP_MODE = $previousAppMode } else { Remove-Item Env:APP_MODE -ErrorAction SilentlyContinue }
    if ($hadDataRoot) { $env:XINLING_DATA_DIR = $previousDataRoot } else { Remove-Item Env:XINLING_DATA_DIR -ErrorAction SilentlyContinue }
  }
}

function Set-CnAdminInitCode {
  param($Map, [string]$AdminPresence)

  if ($AdminPresence -eq "has_admin") {
    Write-SafeStatus (Get-Zh "5Yid5aeL5YyW56CB5LuF55So5LqO6aaW5qyh5Yib5bu6566h55CG5ZGY44CC5b2T5YmN57O757uf5bey5pyJ566h55CG5ZGY77yM5pys5qyh5pyq5L+u5pS55Yid5aeL5YyW56CB44CC")
    return
  }
  if ($AdminPresence -ne "no_admin") {
    Fail-XinlingStage "admin_status_check_failed" (Get-Zh "5peg5rOV5a6J5YWo56Gu6K6k566h55CG5ZGY54q25oCB77yM5bey5YGc5q2i6YWN572u44CC6K+35qOA5p+l5pWw5o2u5bqT5ZCO6YeN6K+V44CC") "admin_presence_unknown"
  }

  $existing = if ($Map.ContainsKey("CN_ADMIN_INIT_CODE")) { [string]$Map["CN_ADMIN_INIT_CODE"] } else { "" }
  $existingValid = Test-ValidAdminInitCode $existing
  if ($existingValid) {
    $first = Read-SecurePlainValue (Get-Zh "566h55CG5ZGY5Yid5aeL5YyW56CB5bey6YWN572u44CC55u05o6l5Zue6L2m5Y+v5L+d55WZ546w5pyJ5YC877yb6L6T5YWl5paw5YC85Y+v5a6J5YWo5pu/5o2i44CC")
    if ([string]::IsNullOrWhiteSpace($first)) { return }
  } else {
    Write-SafeStatus (Get-Zh "5b2T5YmN5pWw5o2u55uu5b2V5bCa5pyq5Yib5bu6566h55CG5ZGY44CC6K+36K6+572u6aaW5qyh566h55CG5ZGY5Yid5aeL5YyW56CB77yI6Iez5bCROOS4quWtl+espu+8jOW7uuiuruS9v+eUqOWtl+avjeOAgeaVsOWtl+WSjOespuWPt+e7hOWQiO+8ieOAgg==")
    $first = ""
  }

  while ($true) {
    if ([string]::IsNullOrWhiteSpace($first)) {
      $first = Read-SecurePlainValue "CN_ADMIN_INIT_CODE"
    }
    $first = $first.Trim()
    if (!(Test-ValidAdminInitCode $first)) {
      Write-SafeStatus (Get-Zh "5Yid5aeL5YyW56CB6Iez5bCR6ZyA6KaBOOS4quWtl+espu+8jOivt+mHjeaWsOiuvue9ruOAgg==")
      $first = ""
      continue
    }

    $confirm = Read-SecurePlainValue (Get-Zh "6K+35YaN5qyh6L6T5YWl566h55CG5ZGY5Yid5aeL5YyW56CB")
    if (![string]::Equals($first, $confirm, [System.StringComparison]::Ordinal)) {
      Write-SafeStatus (Get-Zh "5Lik5qyh6L6T5YWl5LiN5LiA6Ie077yM6K+36YeN5paw6K6+572u44CC")
      $first = ""
      $confirm = ""
      continue
    }

    $Map["CN_ADMIN_INIT_CODE"] = $first
    $first = ""
    $confirm = ""
    Write-SafeStatus (Get-Zh "566h55CG5ZGY5Yid5aeL5YyW56CB5bey5a6J5YWo5L+d5a2Y44CC")
    return
  }
}

function Set-EnvValue {
  param($Map, [string]$Name, [string]$Prompt, [switch]$Secret, [string]$Default = "")
  $oldExists = $Map.ContainsKey($Name) -and $Map[$Name]
  if ($Secret) {
    $secure = Read-Host "$Prompt (blank keeps current, DELETE removes)" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  } else {
    $plain = Read-Host "$Prompt (blank keeps current)"
  }
  if ($plain -eq "DELETE") { $Map.Remove($Name); return }
  if ([string]::IsNullOrWhiteSpace($plain)) {
    if (!$oldExists -and $Default) { $Map[$Name] = $Default }
    return
  }
  $Map[$Name] = $plain.Trim().Trim([char]34).Trim([char]39).Trim()
}

$envMap = Read-ExistingEnv
$envMap["APP_MODE"] = "school"
Set-EnvValue $envMap "HOST" "HOST" -Default "0.0.0.0"
Set-EnvValue $envMap "PORT" "PORT" -Default "4185"
Set-EnvValue $envMap "XINLING_DATA_DIR" "XINLING_DATA_DIR" -Default $DataRoot
try {
  $normalizedDataRoot = Normalize-XinlingDataRoot $envMap["XINLING_DATA_DIR"]
  $envMap["XINLING_DATA_DIR"] = $normalizedDataRoot
  Set-XinlingDataRoot $normalizedDataRoot
  Ensure-XinlingDirs
} catch {
  Fail-XinlingStage "runtime_config_failed" (Get-Zh "5pWw5o2u55uu5b2V6YWN572u5peg5pWI44CC6K+36L6T5YWl57G75Ly8IEM6XFByb2dyYW1EYXRhXFhpbmxpbmdIdWFqdWFuLVRlc3Qg55qEIFdpbmRvd3Mg57ud5a+56Lev5b6E44CC") $_
}
if (!$envMap.ContainsKey("CN_SESSION_SECRET")) {
  $bytes = New-Object byte[] 48
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  $envMap["CN_SESSION_SECRET"] = [Convert]::ToBase64String($bytes)
}
$adminPresence = Get-CnAdminPresence
Set-CnAdminInitCode $envMap $adminPresence
Set-EnvValue $envMap "QWEN_API_KEY" "QWEN_API_KEY" -Secret
Set-EnvValue $envMap "QWEN_BASE_URL" "QWEN_BASE_URL"
Set-EnvValue $envMap "QWEN_VISION_MODEL" "QWEN_VISION_MODEL" -Default "qwen3.7-plus"
Set-EnvValue $envMap "DEEPSEEK_API_KEY" "DEEPSEEK_API_KEY" -Secret
Set-EnvValue $envMap "DEEPSEEK_BASE_URL" "DEEPSEEK_BASE_URL" -Default "https://api.deepseek.com"
Set-EnvValue $envMap "DEEPSEEK_TEXT_MODEL" "DEEPSEEK_TEXT_MODEL" -Default "deepseek-chat"
Set-EnvValue $envMap "OPENAI_API_KEY" "OPENAI_API_KEY optional" -Secret
Set-EnvValue $envMap "OPENAI_MODEL" "OPENAI_MODEL optional"

$lines = $envMap.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" }
New-Item -ItemType Directory -Force -Path $DefaultConfigDir | Out-Null
Set-Content -LiteralPath $DefaultAppEnvPath -Value $lines -Encoding UTF8
if ($AppEnvPath -ne $DefaultAppEnvPath) {
  Set-Content -LiteralPath $AppEnvPath -Value $lines -Encoding UTF8
}
Write-SafeStatus "Config saved to: $AppEnvPath"
Write-SafeStatus "Secrets were not printed."
