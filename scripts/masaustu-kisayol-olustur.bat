@echo off
chcp 65001 >nul
cd /d "%~dp0.."
node scripts/create-shortcut.mjs
echo.
pause
