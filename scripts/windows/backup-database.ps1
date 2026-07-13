. "$PSScriptRoot\common.ps1"
Ensure-XinlingDirs
$env:APP_MODE = "school"
$env:XINLING_DATA_DIR = $DataRoot
node -e "const {loadRuntimeConfig}=require('./config/loadRuntimeConfig'); loadRuntimeConfig(); const {createCommandLineBackup}=require('./services/backupService'); createCommandLineBackup().then(r=>{console.log('Backup file: '+r.filePath); console.log('SHA-256: '+r.metadata.sha256);}).catch(()=>{console.error('database_backup_failed'); process.exit(1);});"
exit $LASTEXITCODE
