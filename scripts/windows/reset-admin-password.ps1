. "$PSScriptRoot\common.ps1"

$env:APP_MODE = "school"
$env:XINLING_DATA_DIR = $DataRoot
Set-Location -LiteralPath $ProjectRoot

& node (Join-Path $ProjectRoot "scripts\resetAdminPassword.js")
exit $LASTEXITCODE
