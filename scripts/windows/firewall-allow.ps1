. "$PSScriptRoot\common.ps1"
$port = $DefaultPort
$ruleName = "XinlingHuajuan-School-LAN-$port"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (!$isAdmin) { Write-SafeStatus "firewall_admin_required"; exit 1 }
if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) { Write-SafeStatus "Firewall rule already exists."; exit 0 }
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private | Out-Null
Write-SafeStatus "Firewall rule created for Private network TCP port $port."
Write-SafeStatus "Do not expose this system to the public internet."
