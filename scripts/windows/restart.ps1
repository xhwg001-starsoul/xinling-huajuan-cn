. "$PSScriptRoot\common.ps1"
& "$PSScriptRoot\stop.ps1"
Start-Sleep -Seconds 2
& "$PSScriptRoot\start.ps1"
