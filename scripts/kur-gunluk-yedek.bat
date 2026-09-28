@echo off
chcp 65001 >nul
title Ren Endüstriyel - Otomatik Günlük Yedek Kurulumu
cls
echo ===================================================================
echo   Ren Endüstriyel · Otomatik Günlük Yedek Kurulum Sihirbazı
echo ===================================================================
echo.
echo Bu işlem, Windows Görev Zamanlayıcısına her sabah saat 08:00'de
echo canlı sistemden yedek alacak otomatik bir görev ekleyecektir.
echo.
echo Yedekler varsayılan olarak "C:\RenMuhasebe_Yedekler" klasörüne kaydedilecektir.
echo.

cd /d "%~dp0.."

schtasks /create /tn "RenMuhasebe_GunlukYedek" /tr "node \"%CD%\scripts\backup-daily.mjs\"" /sc daily /st 08:00 /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================================
    echo [BAŞARILI] Günlük yedekleme görevi Windows'a kaydedildi!
    echo Görev Adı: RenMuhasebe_GunlukYedek
    echo Çalışma Zamanı: Her gün saat 08:00
    echo ===================================================================
    echo.
    echo Şimdi ilk testi yapmak için anlık bir yedek alınıyor...
    echo.
    node scripts/backup-daily.mjs
) else (
    echo.
    echo ===================================================================
    echo [UYARI] Görev Zamanlayıcıya eklenirken yönetici izni gerekebilir.
    echo Lütfen bu dosyaya sağ tıklayıp "Yönetici olarak çalıştır" seçeneğini kullanın.
    echo ===================================================================
)

echo.
pause
