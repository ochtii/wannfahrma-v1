# 🔒 Security Scripts

Sicherheitstools für automatisierte Checks und Validierungen.

## 📁 Verfügbare Tools

### `security-check.sh` - Linux/macOS Security Check
**Umfassende Sicherheitsprüfung für Unix-Systeme:**

🔍 **Überprüft:**
- `.env` Dateien auf Secrets (verhindert Commit von Credentials)
- Hardcoded URLs und IP-Adressen in JavaScript
- Große Dateien (>10MB) die nicht ins Git gehören
- Gefährliche Dateitypen (`.pem`, `.key`, `.p12`, etc.)
- `.gitignore` Konfiguration
- File Permissions auf Scripts

✅ **Features:**
- Läuft automatisch vom Projekt-Root
- Farbige Output für bessere Lesbarkeit
- Exit Code 1 bei kritischen Problemen
- Git Hook Integration möglich

### `security-check.bat` - Windows Security Check
**Entsprechende Sicherheitsprüfung für Windows:**

🔍 **Überprüft:**
- `.env` Dateien Erkennung
- Basic Hardcoded Secrets Detection
- `.gitignore` Validierung
- PowerShell-kompatible Checks

✅ **Features:**
- Wechselt automatisch zum Projekt-Root
- Batch-File Kompatibilität
- Ähnliche Funktionalität wie Linux-Version

## 🚀 Verwendung

### Manuelle Ausführung

#### Linux/macOS
```bash
# Direkt ausführen
chmod +x scripts/security/security-check.sh
./scripts/security/security-check.sh

# Oder aus beliebigem Verzeichnis
cd /path/to/wannfahrma-v1
./scripts/security/security-check.sh
```

#### Windows
```cmd
# PowerShell oder CMD
.\scripts\security\security-check.bat

# Oder Doppelklick im Explorer
```

### Git Hook Integration (empfohlen)

#### Pre-Commit Hook (Linux/macOS)
```bash
# Git Hook installieren
cp scripts/security/security-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Jetzt läuft Security Check automatisch vor jedem Commit
git commit -m "Test commit"  # Security Check läuft automatisch
```

#### Pre-Commit Hook (Windows)
```cmd
copy scripts\security\security-check.bat .git\hooks\pre-commit.bat

REM Git Hook script erstellen
echo @echo off > .git\hooks\pre-commit
echo call "%~dp0pre-commit.bat" >> .git\hooks\pre-commit
```

### CI/CD Integration
```bash
# In GitHub Actions, GitLab CI, etc.
- name: Security Check
  run: ./scripts/security/security-check.sh
```

## 🔍 Was wird überprüft?

### 1. Environment Dateien
```bash
# Gefährliche Dateien
.env
.env.local
.env.production
.env.staging

# Ausnahmen (erlaubt)
.env.example
.env.template
```

**Warum:** Verhindert das versehentliche Committen von API-Keys, Passwörtern und anderen Secrets.

### 2. Hardcoded Secrets
```javascript
// Problematische Patterns
const API_KEY = "sk-1234567890abcdef";
const DATABASE_URL = "postgres://user:pass@host/db";
const SUPABASE_URL = "https://abc123.supabase.co";

// Besser
const API_KEY = process.env.API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
```

### 3. Große Dateien
```bash
# Dateien > 10MB
find . -type f -size +10M

# Typische Problemdateien
node_modules/ (sollte in .gitignore)
*.log (Log-Dateien)
*.dump (Database Dumps)
*.zip (Archive)
```

### 4. Gefährliche Dateitypen
```bash
# Private Keys
*.pem, *.key, *.p12, *.pfx

# Certificates  
*.crt, *.cer

# Archives mit potentiell sensiblen Daten
*.tar.gz, *.zip, *.rar

# IDE/Editor Dateien
.vscode/settings.json (mit lokalen Pfaden)
.idea/ (IntelliJ Konfiguration)
```

### 5. .gitignore Validierung
```bash
# Muss enthalten sein
node_modules/
.env*
!.env.example
*.log
.DS_Store
```

## ⚙️ Konfiguration

### Security Check anpassen

#### Neue Patterns hinzufügen
```bash
# In security-check.sh editieren
vim scripts/security/security-check.sh

# Neue gefährliche Dateitypen
DANGEROUS_PATTERNS="*.pem *.key *.p12 *.pfx *.crt *.cer *.custom"

# Neue Secret Patterns
SECRET_PATTERNS="password|secret|key|token|auth|credential|api.*key"
```

#### Ausnahmen definieren
```bash
# Verzeichnisse ignorieren
-not -path "./docs/*"
-not -path "./test/fixtures/*"
-not -path "./scripts/*"

# Bestimmte Dateien erlauben
if [[ "$file" != "./allowed-exception.key" ]]; then
    # Check durchführen
fi
```

### Automatisierung

#### Pre-Commit Hook mit Bypass
```bash
# Security Check überspringen (Notfall)
git commit -m "Emergency fix" --no-verify

# Oder temporär
export SKIP_SECURITY_CHECK=1
git commit -m "Bypass security check"
```

#### CI/CD Integration
```yaml
# GitHub Actions Beispiel
name: Security Check
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Security Check
        run: ./scripts/security/security-check.sh
```

## 🛠️ Troubleshooting

### Falsche Positive
```bash
# Legitime .env Datei wird erkannt
# Lösung: Umbenennen
mv .env.production .env.production.example

# Oder in Script ausschließen
if [[ "$file" != "./.env.production" ]]; then
```

### Script läuft nicht
```bash
# Permissions prüfen
ls -la scripts/security/security-check.sh

# Executable setzen
chmod +x scripts/security/security-check.sh

# Shebang prüfen
head -1 scripts/security/security-check.sh
# Sollte sein: #!/bin/bash
```

### Windows Encoding Probleme
```cmd
REM Encoding auf UTF-8 setzen
chcp 65001

REM Oder Script in Editor mit UTF-8 speichern
```

## 🔧 Best Practices

### 1. Secrets Management
```bash
# Niemals in Code
❌ const API_KEY = "sk-1234567890abcdef"

# Immer über Environment
✅ const API_KEY = process.env.API_KEY

# Mit Fallback für Development
✅ const API_KEY = process.env.API_KEY || 'development-key'
```

### 2. .gitignore Wartung
```bash
# Regelmäßig prüfen
git check-ignore -v <datei>

# Global gitignore für IDE
git config --global core.excludesfile ~/.gitignore_global
```

### 3. Security als Code
```bash
# Security Check in allen Branches
git config core.hooksPath .githooks/

# Team-weite Hooks
cp scripts/security/security-check.sh .githooks/pre-commit
```

---

🔒 **Wichtig**: Security Checks sind nur der erste Schritt. Regelmäßige Security Audits und Code Reviews bleiben essentiell!

📞 **Support**: Bei Security-Fragen siehe [`../docs/SECURITY.md`](../docs/SECURITY.md) oder erstellen Sie ein GitHub Issue.
