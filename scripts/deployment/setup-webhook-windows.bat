@echo off
echo.
echo ====================================================
echo 🎣 GitHub Webhook Setup für Windows (wann fahrma)
echo ====================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js nicht gefunden!
    echo Bitte installieren: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js gefunden

:: Check if .env exists
if exist .env (
    echo ⚠️  .env Datei existiert bereits
) else (
    echo 📝 Erstelle .env Datei...
)

:: Generate simple webhook secret
set WEBHOOK_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%

:: Create/update .env file
echo. >> .env
echo # GitHub Webhook Configuration (Windows Dev) >> .env
echo WEBHOOK_PORT=3001 >> .env
echo WEBHOOK_SECRET=%WEBHOOK_SECRET% >> .env
echo APP_DIR=%CD% >> .env
echo NODE_ENV=development >> .env

echo ✅ .env konfiguriert

:: Install dependencies if needed
if not exist node_modules (
    echo 📦 Installiere Dependencies...
    npm install
    echo ✅ Dependencies installiert
) else (
    echo ✅ Dependencies bereits vorhanden
)

echo.
echo ==================================================
echo 🎉 Setup abgeschlossen!
echo ==================================================
echo.
echo 🔧 Konfiguration:
echo    Webhook Secret: %WEBHOOK_SECRET%
echo    Port: 3001
echo    Directory: %CD%
echo.
echo 🚀 Webhook Service starten:
echo    node webhook-listener.js
echo.
echo 🧪 Test (nach dem Start):
echo    curl http://localhost:3001/webhook/health
echo.
echo 📋 Für GitHub Setup siehe: docs/webhook-setup.md
echo.
echo ⚠️  Hinweis: Dies ist nur für lokale Entwicklung!
echo    Produktionsserver nutzt Linux Scripts.
echo.
pause
