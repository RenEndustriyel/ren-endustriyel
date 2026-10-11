@echo off
chcp 65001 >nul
title Ren Endüstriyel - Anlık Yedek Alma
cls
echo ========================================================
echo   Ren Endüstriyel · Canlı Veritabanı Yedeği Alınıyor
echo ========================================================
echo.
cd /d "%~dp0.."
node scripts/backup-daily.mjs
echo.
echo ========================================================
echo   İşlem tamamlandı. Çıkmak için bir tuşa basın.
echo ========================================================
pause >nul
