# 🛠️ Scripts & Tools

Zentrale Sammlung aller Hilfsskripts für das wann fahrma OIDA Projekt.

## 📁 Ordner-Übersicht

### 📦 [install/](install/) - Installation Scripts
Automatisierte Installationsskripts für verschiedene Umgebungen:

- **`install-ubuntu.sh`** - Vollständige Ubuntu Server Installation
  - System-Updates, Dependencies, PM2, Nginx-Konfiguration
  - Fehlerbehandlung für häufige Probleme
  - Service-Setup und Firewall-Konfiguration

- **`install-quick.sh`** - Schnelle Basis-Installation
  - Nur Essential Dependencies
  - Für Entwicklungsumgebungen geeignet
  - Minimal Setup ohne Production-Features

- **`test-install.sh`** - System-Check vor Installation
  - Überprüft Systemvoraussetzungen
  - Testet verfügbare Package Manager
  - Validiert Python/Node.js Versionen

### 🔒 [security/](security/) - Security Tools
Sicherheitsüberprüfung und -tools:

- **`security-check.sh`** - Linux/macOS Security Check
  - Überprüft .env Dateien auf Secrets
  - Validiert .gitignore Konfiguration
  - Testet File Permissions

- **`security-check.bat`** - Windows Security Check
  - Entspricht dem Linux-Script für Windows
  - PowerShell-basierte Sicherheitsprüfung
  - Git-Hook Integration möglich

### 🚀 [deployment/](deployment/) - Deployment Scripts
Production-Deployment und Prozess-Management:

- **`deploy.sh`** - Production Deployment Script
  - Git-basiertes Deployment
  - Service-Restart mit PM2
  - Rollback-Funktionalität

- **`ecosystem.config.js`** - PM2 Konfiguration
  - Production Process Management
  - Auto-Restart bei Crashes
  - Logging und Monitoring Setup

## 🚀 Quick Commands

### Installation (Ubuntu)
```bash
# Vollständige Installation
chmod +x install/install-ubuntu.sh
./install/install-ubuntu.sh

# Schnelle Installation
chmod +x install/install-quick.sh
./install/install-quick.sh

# System-Check
chmod +x install/test-install.sh
./install/test-install.sh
```

### Security Check
```bash
# Linux/macOS
chmod +x security/security-check.sh
./security/security-check.sh

# Windows (PowerShell)
.\security\security-check.bat
```

### Deployment
```bash
# Production Deployment
chmod +x deployment/deploy.sh
./deployment/deploy.sh

# PM2 Setup
npm install -g pm2
pm2 start deployment/ecosystem.config.js
```

## 🔧 Verwendung

### 1. Script ausführbar machen (Linux/macOS)
```bash
chmod +x scripts/kategorie/script-name.sh
```

### 2. Script ausführen
```bash
./scripts/kategorie/script-name.sh
```

### 3. Als Git Hook verwenden (optional)
```bash
# Security Check als pre-commit hook
cp scripts/security/security-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## ⚠️ Wichtige Hinweise

### Sicherheit
- Alle Scripts vor Ausführung prüfen
- Environment Variables korrekt setzen
- Nie Secrets in Scripts hardcoden

### Permissions
- Scripts benötigen Ausführungsrechte (`chmod +x`)
- Manche Scripts benötigen sudo-Rechte
- Immer Script-Outputs überprüfen

### Troubleshooting
- Bei Fehlern Logs in `/var/log/` prüfen
- PM2 Status mit `pm2 status` überprüfen
- System-Services mit `systemctl status` checken

---

📞 **Support**: Bei Problemen siehe [`../docs/README.md`](../docs/README.md) oder erstellen Sie ein GitHub Issue.
