. "$PSScriptRoot\common.ps1"
Push-Location $ProjectRoot
try {
  try {
    Ensure-XinlingDirs
  } catch {
    throw
  }

  $pidValue = Get-XinlingPid
  if ((Test-XinlingProcess $pidValue) -or (Test-Health $DefaultPort)) {
    Fail-XinlingStage "app_already_running" (Get-Zh "5qOA5rWL5Yiw5b+D54G155S75Y235q2j5Zyo6L+Q6KGM44CC6K+35YWI5YGc5q2i56iL5bqP77yM5YaN5omn6KGM6aaW5qyh5a6J6KOF77yM6YG/5YWN5L6d6LWW5paH5Lu26KKr6ZSB5a6a44CC") "application is already running"
  }

  $node = Get-Command node -ErrorAction SilentlyContinue
  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (!$node -or !$npm) {
    Fail-XinlingStage "dependency_install_failed" (Get-Zh "5pyq5qOA5rWL5YiwIE5vZGUuanMg5oiWIG5wbS5jbWTjgILor7flronoo4UgTm9kZS5qcyAyMCDmiJbmm7TmlrDniYjmnKzjgII=") "node_or_npm_missing"
  }
  $versionText = node -v
  if ($versionText -notmatch '^v(\d+)') {
    Fail-XinlingStage "dependency_install_failed" (Get-Zh "5peg5rOV6K+G5YirIE5vZGUuanMg54mI5pys44CC6K+356Gu6K6kIE5vZGUuanMg5a6J6KOF5q2j5bi444CC") "node_version_unknown"
  }
  if ([int]$matches[1] -lt 20) {
    Fail-XinlingStage "dependency_install_failed" (Get-Zh "Tm9kZS5qcyDniYjmnKzov4fkvY7jgILor7flronoo4UgTm9kZS5qcyAyMCDmiJbmm7TmlrDniYjmnKzjgII=") "node_version_too_old"
  }

  npm ci
  if ($LASTEXITCODE -ne 0) {
    Fail-XinlingStage "dependency_install_failed" (Get-Zh "5L6d6LWW5a6J6KOF5aSx6LSl44CC6K+35qOA5p+l572R57uc44CBbnBtIOe8k+WtmOaIliBOb2RlLmpzIOWuieijheOAgg==") "npm_ci_failed"
  }

  try {
    & "$PSScriptRoot\configure.ps1"
    if ($LASTEXITCODE -ne 0) {
      Fail-XinlingStage "runtime_config_failed" (Get-Zh "6L+Q6KGM6YWN572u5YaZ5YWl5aSx6LSl44CC6K+35qOA5p+l6YWN572u55uu5b2V5p2D6ZmQ44CC") "configure_script_failed"
    }
    $envMap = Read-XinlingEnvFile $DefaultAppEnvPath
    if ($envMap.ContainsKey("XINLING_DATA_DIR")) {
      Set-XinlingDataRoot $envMap["XINLING_DATA_DIR"]
    }
    Ensure-XinlingDirs
  } catch {
    if ([string]$_.Exception.Message -match '^[a-z_]+$') { throw }
    Fail-XinlingStage "runtime_config_failed" (Get-Zh "6L+Q6KGM6YWN572u5aSx6LSl44CC6K+35qOA5p+l5pWw5o2u55uu5b2V5ZKM6YWN572u55uu5b2V5p2D6ZmQ44CC") $_
  }

  $env:APP_MODE = "school"
  $env:XINLING_DATA_DIR = $DataRoot
  node -e "const {loadRuntimeConfig}=require('./config/loadRuntimeConfig'); loadRuntimeConfig(); const db=require('./services/db').getDatabase(); const r=db.prepare('PRAGMA integrity_check').get(); if(Object.values(r)[0]!=='ok') process.exit(2);"
  if ($LASTEXITCODE -ne 0) {
    Fail-XinlingStage "database_initialization_failed" (Get-Zh "5pWw5o2u5bqT5Yid5aeL5YyW5oiW5a6M5pW05oCn5qOA5p+l5aSx6LSl44CC") "database_check_failed"
  }
  Write-SafeStatus "Install checks completed."
  & "$PSScriptRoot\start.ps1"
} catch {
  if ([string]$_.Exception.Message -notmatch '^[a-z_]+$') {
    Fail-XinlingStage "install_failed" (Get-Zh "6aaW5qyh5a6J6KOF5aSx6LSl44CC6K+35p+l55yL5a6J6KOF5pel5b+X5Lit55qE5a6J5YWo6ZSZ6K+v5pGY6KaB44CC") $_
  }
  exit 1
} finally {
  Pop-Location
}
