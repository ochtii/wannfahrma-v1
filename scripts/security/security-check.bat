@echo off
REM =============================================================================
REM Warten is ORG - Windows Security Check
REM =============================================================================
REM Prueft auf potentielle Sicherheitsprobleme vor Git Commits
REM Läuft automatisch vom Projekt-Root
REM =============================================================================

setlocal enabledelayedexpansion
set ISSUES_FOUND=0

REM Wechsle zum Projekt-Root (zwei Ebenen nach oben von scripts\security\)
cd /d "%~dp0..\.."

echo.
echo ================================================================
echo  🔒 Warten is ORG - Security Check (Windows)
echo  Working Directory: %CD%
echo ================================================================
echo.

REM Check for .env files
echo ℹ️ Pruefe .env Dateien...
set ENV_FILES_FOUND=0
for %%f in (.env*) do (
    if not "%%f"==".env.example" (
        if not "!ENV_FILES_FOUND!"=="0" (
            echo ❌ Gefundene .env Datei: %%f
        ) else (
            echo ❌ Gefundene .env Dateien:
            echo   - %%f
        )
        set ENV_FILES_FOUND=1
        echo ⚠️ Diese Datei sollte NICHT committet werden!
        set /a ISSUES_FOUND+=1
    )
)
if !ENV_FILES_FOUND!==0 (
    echo ✅ Keine .env Dateien gefunden
) else (
    echo ℹ️ .env Dateien existieren (normal, solange nicht committet)
)

echo.

REM Check for hardcoded secrets in JavaScript files
echo ℹ️ Pruefe auf hardcoded Secrets...
findstr /R /C:"['\"][a-zA-Z0-9_-]\{20,\}['\"]" *.js >nul 2>&1
if !errorlevel!==0 (
    echo ⚠️ Potentielle Secrets in JavaScript-Dateien gefunden:
    findstr /R /C:"['\"][a-zA-Z0-9_-]\{20,\}['\"]" *.js | findstr /V "example\|placeholder\|your-" | findstr /V "//"
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ Keine verdächtigen Secrets gefunden
)

echo.

REM Check for large files (exclude known directories)
echo ℹ️ Pruefe auf große Dateien...
set LARGE_FILES_FOUND=0
for /r %%f in (*) do (
    echo %%f | findstr /C:"\data\" >nul && goto :skip_large_file
    echo %%f | findstr /C:"\.git\" >nul && goto :skip_large_file
    echo %%f | findstr /C:"\node_modules\" >nul && goto :skip_large_file
    echo %%f | findstr /C:"\.venv\" >nul && goto :skip_large_file
    
    if %%~zf gtr 10485760 (
        if "!LARGE_FILES_FOUND!"=="0" (
            echo ⚠️ Große Dateien gefunden (^>10MB^):
            set LARGE_FILES_FOUND=1
        )
        set "size=%%~zf"
        set /a size_mb=!size!/1048576
        echo   - %%~nxf (!size_mb!MB)
    )
    :skip_large_file
)
if !LARGE_FILES_FOUND!==0 (
    echo ✅ Keine großen Dateien gefunden
)

echo.

REM Check if .gitignore exists and contains important patterns
echo ℹ️ Pruefe .gitignore...
if not exist .gitignore (
    echo ❌ .gitignore Datei fehlt!
    set /a ISSUES_FOUND+=1
) else (
    set GITIGNORE_OK=1
    
    findstr /C:".env" .gitignore >nul || (
        echo ⚠️ .gitignore fehlt: .env
        set GITIGNORE_OK=0
    )
    
    findstr /C:"node_modules/" .gitignore >nul || (
        echo ⚠️ .gitignore fehlt: node_modules/
        set GITIGNORE_OK=0
    )
    
    findstr /C:"*.log" .gitignore >nul || (
        echo ⚠️ .gitignore fehlt: *.log
        set GITIGNORE_OK=0
    )
    
    if !GITIGNORE_OK!==1 (
        echo ✅ .gitignore enthält wichtige Patterns
    )
)

echo.

REM Check git status for .env files (but not .env.example)
echo ℹ️ Pruefe Git Status...
git status --porcelain | findstr "\.env" | findstr /V "\.env\.example" >nul 2>&1
if !errorlevel!==0 (
    echo ❌ .env Dateien sind in Git staged/tracked:
    git status --porcelain | findstr "\.env" | findstr /V "\.env\.example"
    echo ⚠️ Diese Dateien sollten NICHT committet werden!
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ Keine problematischen .env Dateien in Git tracked
)

echo.
echo ================================================================

if !ISSUES_FOUND!==0 (
    echo ✅ 🎉 Keine kritischen Sicherheitsprobleme gefunden!
    echo.
    echo ✅ Sicher zu committen
    echo.
    echo 💡 Tipps:
    echo   - Stellen Sie sicher dass .env nicht committet wird
    echo   - Verwenden Sie .env.example als Vorlage
    echo   - Halten Sie API-Keys geheim
) else (
    echo ❌ ⚠️ !ISSUES_FOUND! kritische Problem(e) gefunden!
    echo.
    echo ❌ Bitte Probleme beheben vor Commit
    echo.
    echo 🔧 Lösungen:
    echo   - .env Dateien in .gitignore hinzufügen
    echo   - Secrets aus Code entfernen
    echo   - Große Dateien prüfen
    exit /b 1
)

echo ================================================================

pause
