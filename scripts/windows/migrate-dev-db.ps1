. "$PSScriptRoot\common.ps1"
Ensure-XinlingDirs
$source = Join-Path $ProjectRoot "data\xinling-cn.local.db"
$target = Join-Path $DatabaseDir "xinling-cn.db"
if (!(Test-Path $source)) { Write-SafeStatus "Source database not found."; exit 1 }
if (Test-Path $target) { Write-SafeStatus "Target database already exists. Migration cancelled."; exit 1 }
node -e "const Database=require('better-sqlite3'); const db=new Database(process.argv[1],{readonly:true}); const r=db.prepare('PRAGMA integrity_check').get(); db.close(); if(Object.values(r)[0]!=='ok') process.exit(2);" "$source"
if ($LASTEXITCODE -ne 0) { Write-SafeStatus "Source database integrity check failed."; exit 1 }
Copy-Item -Path $source -Destination $target -ErrorAction Stop
node -e "const Database=require('better-sqlite3'); const db=new Database(process.argv[1],{readonly:true}); const r=db.prepare('PRAGMA integrity_check').get(); db.close(); if(Object.values(r)[0]!=='ok') process.exit(2);" "$target"
if ($LASTEXITCODE -ne 0) {
  Remove-Item -Force $target -ErrorAction SilentlyContinue
  Write-SafeStatus "Target integrity check failed. Copied file removed. Source unchanged."
  exit 1
}
Write-SafeStatus "Migration completed. Source database was not modified."
Write-SafeStatus "Target: $target"
