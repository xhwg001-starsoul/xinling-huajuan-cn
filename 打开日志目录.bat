@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command ". '%~dp0scripts\windows\common.ps1'; Ensure-XinlingDirs; Start-Process $LogsDir"
