# 📦 Installation Scripts

Automatisierte Installationsskripts für verschiedene Umgebungen.

## 📁 Verfügbare Scripts

### `install-ubuntu.sh` - Vollständige Ubuntu Installation
**Umfassende Server-Installation mit allem Drum und Dran:**

✅ **Features:**
- System Updates & Essential Packages
- Node.js (neueste LTS Version)  
- Python3 & pip3 mit Fehlerbehebung
- PM2 Process Manager
- Nginx Reverse Proxy Konfiguration
- SSL/TLS Setup (optional)
- Firewall Konfiguration (ufw)
- Service Auto-Start Setup
- Management Scripts erstellen

🎯 **Für:** Production Server, vollständiges Setup

### `install-quick.sh` - Schnelle Basis-Installation  
**Minimale Installation für Entwicklung:**

✅ **Features:**
- Essential System Packages
- Node.js & npm
- Python3 (mit pip3 Fix)
- PM2 Basic Setup
- App Dependencies Installation
- Einfache PM2-Konfiguration

🎯 **Für:** Entwicklungsumgebungen, lokale Tests

### `test-install.sh` - System-Voraussetzungen Tester
**Überprüft System vor Installation:**

✅ **Features:**
- OS-Kompatibilität prüfen
- Verfügbare Package Manager testen
- Node.js/Python Versionen validieren
- Internet-Verbindung testen
- Disk Space überprüfen
- Permissions testen

🎯 **Für:** Pre-Installation Check, Troubleshooting

## 🚀 Verwendung

### 1. Vollständige Production Installation
```bash
# Ubuntu Server (empfohlen für Production)
chmod +x scripts/install/install-ubuntu.sh
./scripts/install/install-ubuntu.sh

# Folgen Sie den Prompts für:
# - Server Domain/Name
# - SSL-Zertifikat Setup
# - Nginx Konfiguration
```

### 2. Schnelle Entwickler-Installation
```bash
# Lokale Entwicklung oder Testing
chmod +x scripts/install/install-quick.sh
./scripts/install/install-quick.sh

# Automatisierte Installation ohne Prompts
```

### 3. System-Check vor Installation
```bash
# Prüfen ob System bereit ist
chmod +x scripts/install/test-install.sh
./scripts/install/test-install.sh

# Behebt häufige Probleme und zeigt Requirements
```

## ⚙️ Systemvoraussetzungen

### Mindestanforderungen
- **OS**: Ubuntu 20.04 LTS oder neuer
- **RAM**: 512 MB (1GB+ empfohlen)
- **Disk**: 1GB freier Speicher
- **Network**: Internet-Verbindung für Package Downloads

### Empfohlene Specs (Production)
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 2GB+ 
- **CPU**: 2+ Cores
- **Disk**: 10GB+ SSD
- **Network**: Stabile Verbindung, Domain-Name

## 🔧 Konfiguration

### Environment Variables
```bash
# Vor Installation optional setzen
export WANNFAHRMA_PORT=3000
export WANNFAHRMA_DOMAIN=your-domain.com

# Oder nach Installation in .env
echo "PORT=3000" > .env
echo "NODE_ENV=production" >> .env
```

### Custom Installation
```bash
# Script-Variablen anpassen (vor Ausführung)
vim scripts/install/install-ubuntu.sh

# Wichtige Variablen:
# - APP_DIR (Installation Pfad)
# - NODE_VERSION (Node.js Version)
# - SERVER_NAME (Domain)
```

## 🔍 Was wird installiert?

### System Packages
```bash
# Essential tools
curl wget git build-essential

# Node.js via NodeSource repository
nodejs npm

# Python stack  
python3 python3-pip python3-venv

# Process manager
pm2 (global npm package)

# Web server (nur install-ubuntu.sh)
nginx

# Security tools
ufw (Ubuntu Firewall)
```

### Application Setup
```bash
# Project clone
git clone [repo] ~/wannfahrma-v1

# Dependencies
npm ci --production

# Python packages
pip3 install -r requirements.txt

# PM2 configuration
scripts/deployment/ecosystem.config.js

# Service startup
systemctl enable nginx
pm2 startup
```

## 🛠️ Troubleshooting

### Häufige Probleme

#### 1. pip3 nicht gefunden
```bash
# Fix (automatisch in Scripten)
sudo apt install python3-pip
sudo ln -sf /usr/bin/pip3 /usr/bin/pip
```

#### 2. Node.js Version zu alt
```bash
# Fix (automatisch in install-ubuntu.sh)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. Permission Denied
```bash
# Script ausführbar machen
chmod +x scripts/install/*.sh

# Als normaler User ausführen (nicht root)
./scripts/install/install-ubuntu.sh
```

#### 4. Port 3000 belegt
```bash
# Port prüfen
sudo netstat -tlnp | grep :3000

# Service stoppen
sudo systemctl stop [service-name]

# Oder anderen Port verwenden
export PORT=3001
```

### Debug Mode
```bash
# Verbose output
bash -x scripts/install/install-ubuntu.sh

# Step-by-step execution
bash -i scripts/install/install-ubuntu.sh
```

## 📋 Nach der Installation

### Verify Installation
```bash
# Service Status
pm2 status wannfahrma
sudo systemctl status nginx

# App erreichbar?
curl http://localhost:3000
curl http://your-domain.com

# Logs prüfen
pm2 logs wannfahrma
sudo tail -f /var/log/nginx/error.log
```

### Management Commands
```bash
# Nach install-ubuntu.sh verfügbar:
./start.sh     # App starten
./stop.sh      # App stoppen  
./restart.sh   # App neu starten
./status.sh    # Status & Logs anzeigen
./update.sh    # Code aktualisieren
```

## 🔄 Updates & Maintenance

### App Updates
```bash
# Mit Management Script (nach install-ubuntu.sh)
./update.sh

# Oder manuell
cd ~/wannfahrma-v1
git pull
npm ci --production
pm2 restart wannfahrma
```

### System Updates
```bash
# System Packages aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js Updates
sudo npm install -g npm@latest
sudo npm install -g pm2@latest
```

---

📞 **Support**: Bei Installationsproblemen siehe [`../docs/INSTALL-UBUNTU.md`](../docs/INSTALL-UBUNTU.md) oder erstellen Sie ein GitHub Issue.
