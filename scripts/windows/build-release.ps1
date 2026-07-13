. "$PSScriptRoot\common.ps1"
$pkg = Get-Content (Join-Path $ProjectRoot "package.json") | ConvertFrom-Json
$releaseDir = Join-Path $ProjectRoot "release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$zipName = "xinling-huajuan-cn-v$($pkg.version).zip"
$zipPath = Join-Path $releaseDir $zipName
$manifestPath = Join-Path $releaseDir "release-manifest.json"
$shaPath = Join-Path $releaseDir "xinling-huajuan-cn-v$($pkg.version).sha256"
Remove-Item -Force $zipPath, $manifestPath, $shaPath -ErrorAction SilentlyContinue
$temp = Join-Path $env:TEMP ("xinling-release-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $temp | Out-Null
$exclude = @(".git","node_modules","data","release","backups","logs","runtime","updates",".env",".env.local","app.env")
Get-ChildItem $ProjectRoot -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
  Copy-Item $_.FullName -Destination (Join-Path $temp $_.Name) -Recurse -Force
}
Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $zipPath -Force
$sha = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -Path $shaPath -Value "$sha  $zipName" -Encoding ASCII
$manifest = [ordered]@{ application="xinling-huajuan-cn"; version=$pkg.version; createdAt=(Get-Date).ToUniversalTime().ToString("o"); minimumNodeVersion=$pkg.engines.node; schemaVersion=0; packageSha256=$sha }
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8
Remove-Item -Recurse -Force $temp
Write-SafeStatus "Release package: $zipPath"
Write-SafeStatus "SHA-256: $sha"
