. "$PSScriptRoot\common.ps1"
$port = $DefaultPort
$ruleName = "XinlingHuajuan-School-LAN-$port"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (!$isAdmin) { Write-SafeStatus "firewall_admin_required"; exit 1 }
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (!$existing) { Write-SafeStatus "Firewall rule not found."; exit 0 }
Remove-NetFirewallRule -DisplayName $ruleName
Write-SafeStatus "Firewall rule removed."
