. "$PSScriptRoot\common.ps1"

$pkg = Get-Content -LiteralPath (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
$releaseDir = Join-Path $ProjectRoot "release"
$zipName = "xinling-huajuan-cn-v$($pkg.version).zip"
$zipPath = Join-Path $releaseDir $zipName
$manifestPath = Join-Path $releaseDir "release-manifest.json"
$shaPath = Join-Path $releaseDir "xinling-huajuan-cn-v$($pkg.version).sha256"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("xinling-release-" + [guid]::NewGuid().ToString("N"))

$AllowedDirectories = @(
  "api",
  "assets",
  "config",
  "docs",
  "scripts",
  "services",
  "supabase"
)

$AllowedRootFiles = @(
  "app.js",
  "index.html",
  "styles.css",
  "local-server.js",
  "model-adapters.js",
  "package.json",
  "package-lock.json",
  "README.md",
  ".env.example"
)

$AllowedBatchFiles = @(
  "停止心灵画卷.bat",
  "创建学校部署包.bat",
  "升级心灵画卷.bat",
  "取消局域网访问.bat",
  "取消开机自启动.bat",
  "启动心灵画卷.bat",
  "备份数据库.bat",
  "安装开机自启动.bat",
  "恢复数据库.bat",
  "打开日志目录.bat",
  "查看运行状态.bat",
  "迁移现有数据到学校版.bat",
  "配置局域网访问.bat",
  "配置心灵画卷.bat",
  "重启心灵画卷.bat",
  "首次安装与配置心灵画卷.bat"
)

$ForbiddenDirectoryNames = @(
  ".git",
  ".github",
  "node_modules",
  "data",
  "school-data",
  "school-data-test",
  "backups",
  "logs",
  "runtime",
  "updates",
  "release",
  "coverage",
  "test-results",
  "playwright-report",
  "uploads"
)

$SensitiveNames = @(
  "OPENAI_API_KEY",
  "QWEN_API_KEY",
  "DASHSCOPE_API_KEY",
  "DEEPSEEK_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CN_SESSION_SECRET",
  "CN_ADMIN_INIT_CODE",
  "ADMIN_SETTINGS_CODE",
  "ACCESS_CODE"
)

$TextExtensions = @(
  ".js", ".json", ".md", ".txt", ".html", ".css", ".ps1", ".bat",
  ".cmd", ".sql", ".example", ".yml", ".yaml", ".xml"
)

function Get-ReleaseRelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$FullName
  )

  $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd([char]92, [char]47) + [System.IO.Path]::DirectorySeparatorChar
  $filePath = [System.IO.Path]::GetFullPath($FullName)
  if (!$filePath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "release_source_outside_allowed_root"
  }
  return $filePath.Substring($rootPath.Length).Replace([char]92, [char]47)
}

function Test-UnsafeReleasePath {
  param([Parameter(Mandatory = $true)][string]$RelativePath)

  $normalized = $RelativePath.Replace([char]92, [char]47).TrimStart([char]47)
  $segments = @($normalized -split "/")
  $leaf = $segments[-1].ToLowerInvariant()

  foreach ($segment in $segments) {
    if ($ForbiddenDirectoryNames -contains $segment.ToLowerInvariant()) { return $true }
  }

  if ($leaf -eq ".env.example") { return $false }
  if ($leaf -eq ".env" -or $leaf.StartsWith(".env.")) { return $true }
  if ($leaf -eq "app.env") { return $true }
  if ($leaf -like "*.temp-backup" -or $leaf -like "*.backup" -or $leaf -like "*.bak") { return $true }
  if ($leaf -like "*.db" -or $leaf -like "*.db-wal" -or $leaf -like "*.db-shm") { return $true }
  if ($leaf -like "*.sqlite" -or $leaf -like "*.sqlite-*" -or $leaf -like "*.sqlite3" -or $leaf -like "*.sqlite3-*") { return $true }
  if ($leaf -like "*.log" -or $leaf -like "npm-debug.log*" -or $leaf -like "yarn-*.log*" -or $leaf -like "pnpm-debug.log*") { return $true }
  if ($leaf -like "*.zip" -or $leaf -like "*.patch" -or $leaf -like "*.diff") { return $true }
  if ($leaf -like "*.tmp" -or $leaf -like "*.temp" -or $leaf.EndsWith("~")) { return $true }
  return $false
}

function Copy-AllowedReleaseFile {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$RelativePath
  )

  if (Test-UnsafeReleasePath $RelativePath) {
    throw "unsafe_release_source_path: $RelativePath"
  }
  $item = Get-Item -LiteralPath $Source -Force
  if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "release_reparse_point_not_allowed: $RelativePath"
  }

  $destination = Join-Path $temp ($RelativePath.Replace([char]47, [System.IO.Path]::DirectorySeparatorChar))
  $destinationParent = Split-Path -Parent $destination
  if (!(Test-Path -LiteralPath $destinationParent)) {
    New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null
  }
  Copy-Item -LiteralPath $Source -Destination $destination -Force
}

function Test-SafePlaceholder {
  param([AllowEmptyString()][string]$Value)

  $candidate = if ($null -eq $Value) { "" } else { $Value.Trim().Trim([char]34).Trim([char]39).Trim() }
  if ([string]::IsNullOrWhiteSpace($candidate)) { return $true }
  if ($candidate -match '^(<[^>]+>|\$\{[^}]+\}|[.]{3}|…)$') { return $true }
  return $candidate -match '(?i)(placeholder|example|sample|replace|change|your|legacy|optional|deprecated|not[-_ ]?used|示例|占位|旧版|已停用|不再使用)'
}

function Get-SensitiveContentFindings {
  param([Parameter(Mandatory = $true)][string]$Root)

  $findings = New-Object System.Collections.Generic.List[string]
  foreach ($file in Get-ChildItem -LiteralPath $Root -Recurse -Force -File) {
    $relativePath = Get-ReleaseRelativePath -Root $Root -FullName $file.FullName
    if ($TextExtensions -notcontains $file.Extension.ToLowerInvariant()) { continue }

    try {
      $lines = [System.IO.File]::ReadAllLines($file.FullName)
    } catch {
      $findings.Add("unreadable_text_file: $relativePath")
      continue
    }

    if ($relativePath -ieq ".env.example") {
      foreach ($line in $lines) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
          $name = $matches[1]
          $value = $matches[2]
          if ($name -match '(?i)(API_KEY|SECRET|PASSWORD|TOKEN|INIT_CODE|ACCESS_CODE|ADMIN_SETTINGS_CODE|SERVICE_ROLE_KEY)$' -and !(Test-SafePlaceholder $value)) {
            $findings.Add("unsafe_env_example_value: $relativePath ($name)")
          }
        }
      }
    }

    foreach ($line in $lines) {
      foreach ($name in $SensitiveNames) {
        $escapedName = [regex]::Escape($name)
        if ($line -match ("^\s*(?:export\s+)?" + $escapedName + "\s*=\s*(.*?)\s*$")) {
          $value = $matches[1]
          $isMarkdownProse = $file.Extension -ieq ".md" -and (
            $value -match '\s' -or $value -match '^[\p{IsCJKUnifiedIdeographs}]+$'
          )
          if (!(Test-SafePlaceholder $value) -and !$isMarkdownProse) {
            $findings.Add("sensitive_assignment: $relativePath ($name)")
          }
        }
        $literalPattern = '(?:[''"])?\b' + $escapedName + '\b(?:[''"])?\s*[:=]\s*(?:''([^'']+)''|"([^\"]+)")'
        if ($line -match $literalPattern) {
          $value = if ($matches[1]) { $matches[1] } else { $matches[2] }
          if (!(Test-SafePlaceholder $value) -and $value -notmatch '^(loaded|missing|configured|unconfigured)$') {
            $findings.Add("sensitive_literal: $relativePath ($name)")
          }
        }
      }

      if ($line -match '(?i)\bsk-[A-Za-z0-9_-]{20,}\b') {
        $findings.Add("possible_api_credential: $relativePath")
      }
      if ($line -match '(?i)\bBearer\s+[A-Za-z0-9._~+/-]{24,}=*') {
        $findings.Add("possible_bearer_credential: $relativePath")
      }
      if ($line -match '\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b') {
        $findings.Add("possible_jwt_credential: $relativePath")
      }
    }
  }
  return @($findings | Sort-Object -Unique)
}

function Assert-SafeReleaseTree {
  param([Parameter(Mandatory = $true)][string]$Root)

  $unsafePaths = @(
    Get-ChildItem -LiteralPath $Root -Recurse -Force | ForEach-Object {
      $relativePath = Get-ReleaseRelativePath -Root $Root -FullName $_.FullName
      if (Test-UnsafeReleasePath $relativePath) { $relativePath }
    }
  )
  if ($unsafePaths.Count -gt 0) {
    throw ("unsafe_release_paths:`n" + (($unsafePaths | Sort-Object -Unique) -join "`n"))
  }

  $sensitiveFindings = @(Get-SensitiveContentFindings -Root $Root)
  if ($sensitiveFindings.Count -gt 0) {
    throw ("sensitive_release_content_detected:`n" + ($sensitiveFindings -join "`n"))
  }
}

$buildSucceeded = $false
try {
  New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
  Remove-Item -Force -LiteralPath $zipPath, $manifestPath, $shaPath -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $temp | Out-Null

  foreach ($relativePath in $AllowedRootFiles + $AllowedBatchFiles) {
    $source = Join-Path $ProjectRoot $relativePath
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) {
      throw "required_release_file_missing: $relativePath"
    }
    Copy-AllowedReleaseFile -Source $source -RelativePath $relativePath
  }

  foreach ($directoryName in $AllowedDirectories) {
    $sourceRoot = Join-Path $ProjectRoot $directoryName
    if (!(Test-Path -LiteralPath $sourceRoot -PathType Container)) {
      throw "required_release_directory_missing: $directoryName"
    }
    foreach ($file in Get-ChildItem -LiteralPath $sourceRoot -Recurse -Force -File) {
      $relativeWithinDirectory = Get-ReleaseRelativePath -Root $sourceRoot -FullName $file.FullName
      $relativePath = "$directoryName/$relativeWithinDirectory"
      Copy-AllowedReleaseFile -Source $file.FullName -RelativePath $relativePath
    }
  }

  Assert-SafeReleaseTree -Root $temp

  $releaseFiles = @(
    Get-ChildItem -LiteralPath $temp -Recurse -Force -File |
      ForEach-Object { Get-ReleaseRelativePath -Root $temp -FullName $_.FullName } |
      Sort-Object
  )

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $temp,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )

  $sha = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -LiteralPath $shaPath -Value "$sha  $zipName" -Encoding ASCII

  $manifest = [ordered]@{
    application = "xinling-huajuan-cn"
    version = $pkg.version
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    minimumNodeVersion = $pkg.engines.node
    schemaVersion = 0
    allowedSourceEntries = @($AllowedDirectories + $AllowedRootFiles + $AllowedBatchFiles)
    files = $releaseFiles
    fileCount = $releaseFiles.Count
    packageFile = $zipName
    packageSha256 = $sha
    securityDeclaration = "This package contains no database, runtime configuration, logs, backups, or user data."
  }
  $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

  $buildSucceeded = $true
  Write-SafeStatus "Release package: $zipPath"
  Write-SafeStatus "Manifest: $manifestPath"
  Write-SafeStatus "SHA-256: $sha"
} catch {
  Remove-Item -Force -LiteralPath $zipPath, $manifestPath, $shaPath -ErrorAction SilentlyContinue
  $summary = Get-SafeErrorSummary $_
  Write-Error "release_package_failed: $summary"
} finally {
  if (Test-Path -LiteralPath $temp) {
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if (!$buildSucceeded) { exit 1 }
