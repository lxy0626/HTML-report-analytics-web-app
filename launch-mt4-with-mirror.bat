@echo off
start "" /min powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0launch-mt4-with-mirror.ps1"
