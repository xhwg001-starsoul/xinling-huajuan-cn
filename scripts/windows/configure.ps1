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
if (!$envMap.ContainsKey("CN_ADMIN_INIT_CODE")) {
  $envMap["CN_ADMIN_INIT_CODE"] = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 16 | ForEach-Object {[char]$_})
  Write-SafeStatus "CN_ADMIN_INIT_CODE generated. Keep it safely. It will not be printed again."
}
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
