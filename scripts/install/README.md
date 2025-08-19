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

## 🚀 Schnellstart

### 1. Repository clonen
```bash
# HTTPS (empfohlen für die meisten Nutzer)
git clone https://github.com/ochtii/wannfahrma-v1.git
cd wannfahrma-v1

# SSH (für Entwickler mit SSH-Keys)
git clone git@github.com:ochtii/wannfahrma-v1.git
cd wannfahrma-v1

# Oder ZIP Download
wget https://github.com/ochtii/wannfahrma-v1/archive/refs/heads/master.zip
unzip master.zip
cd wannfahrma-v1-master
```

### 2. Vollständige Installation (Ubuntu Server)
```bash
# Ausführbare Rechte setzen
chmod +x scripts/install/install-ubuntu.sh

# Installation starten (als normaler User, nicht root!)
./scripts/install/install-ubuntu.sh

# Script fragt interaktiv nach:
# - Domain/Server-Name für Nginx
# - SSL-Zertifikat Installation (Let's Encrypt)
# - Firewall-Konfiguration
```

### 3. Schnelle Installation (Development)
```bash
# Für lokale Entwicklung oder Testing
chmod +x scripts/install/install-quick.sh
./scripts/install/install-quick.sh

# Läuft vollautomatisch ohne Eingaben
```

### 4. System-Check vor Installation
```bash
# Empfohlen vor Production-Installation
chmod +x scripts/install/test-install.sh
./scripts/install/test-install.sh

# Zeigt potentielle Probleme auf
```

## 📋 Voraussetzungen

### Minimum System Requirements
- **OS**: Ubuntu 20.04 LTS oder neuer
- **RAM**: 1GB (2GB+ empfohlen für Production)
- **Disk**: 5GB freier Speicher
- **User**: Sudo-Rechte erforderlich (nicht als root ausführen!)

### Netzwerk-Anforderungen
```bash
# Erforderliche Pakete (werden automatisch installiert)
curl wget git build-essential

# Node.js (LTS Version)
# Python3 + pip3
# PM2 (Process Manager)

# Optional für Production
# Nginx (Reverse Proxy)
# Certbot (SSL-Zertifikate)
# UFW (Firewall)
```

### ⚠️ Python Environment Hinweis (Ubuntu 24.04+)
**Wichtig**: Ubuntu 24.04+ und Debian 12+ verwenden "externally-managed" Python environments.

```bash
# Problem: Dieser Fehler kann auftreten
error: externally-managed-environment

# Lösung: Scripts verwenden automatisch apt-Pakete
sudo apt install python3-pandas python3-openpyxl python3-requests

# Für custom Python-Apps: pipx verwenden
sudo apt install pipx
pipx install your-package
```

**Unsere Scripts erkennen das automatisch und verwenden die richtige Methode!**

### Git Konfiguration (optional)
```bash
# Für eigene Entwicklung
git config --global user.name "Ihr Name"
git config --global user.email "ihre.email@example.com"

# SSH Key für GitHub (optional)
ssh-keygen -t ed25519 -C "ihre.email@example.com"
cat ~/.ssh/id_ed25519.pub
# Public Key zu GitHub Account hinzufügen
```

## 🔧 Detaillierte Installation

### Option A: Vollständige Server-Installation

#### 1. Repository herunterladen
```bash
# Mit Git (empfohlen)
git clone https://github.com/ochtii/wannfahrma-v1.git
cd wannfahrma-v1

# Aktuelle Version abrufen
git pull origin master
```

#### 2. System-Check durchführen
```bash
# System-Voraussetzungen prüfen
chmod +x scripts/install/test-install.sh
./scripts/install/test-install.sh
```

#### 3. Installation ausführen
```bash
# Vollständige Installation
chmod +x scripts/install/install-ubuntu.sh
./scripts/install/install-ubuntu.sh
```

**Was passiert während der Installation:**
1. 🔄 System-Update (`apt update && apt upgrade`)
2. 📦 Essential Packages (`curl`, `wget`, `git`, `build-essential`)
3. 🟢 Node.js LTS Installation
4. 🐍 Python3 + pip3 Setup (mit Fehlerbehebung)
5. ⚙️ PM2 Process Manager
6. 🌐 Nginx Reverse Proxy (optional)
7. 🔒 SSL/TLS Zertifikate (Let's Encrypt)
8. 🛡️ Firewall Konfiguration
9. 🚀 App Installation & Konfiguration
10. 📜 Management Scripts erstellen

### Option B: Schnelle Entwickler-Installation

#### 1. Repository clonen
```bash
git clone https://github.com/ochtii/wannfahrma-v1.git
cd wannfahrma-v1
```

#### 2. Schnell-Installation
```bash
chmod +x scripts/install/install-quick.sh
./scripts/install/install-quick.sh
```

#### 3. Manueller Start (optional)
```bash
# App manuell starten (ohne PM2)
npm start

# Oder mit PM2
pm2 start server.js --name wannfahrma
```

### Option C: Manuelle Installation

#### 1. Repository setup
```bash
# Clone & Navigate
git clone https://github.com/ochtii/wannfahrma-v1.git
cd wannfahrma-v1

# Umgebung konfigurieren
cp .env.example .env
# .env editieren mit echten Werten
```

#### 2. Dependencies installieren
```bash
# System packages
sudo apt update
sudo apt install -y curl wget git nodejs npm python3 python3-pip

# Node.js Dependencies
npm install

# Python Dependencies (falls benötigt)
pip3 install -r requirements.txt || echo "Keine Python requirements"
```

#### 3. App starten
```bash
# Development
npm run dev

# Production
npm start

# Mit PM2
npm install -g pm2
pm2 start scripts/deployment/ecosystem.config.js
```

## 🛠️ Troubleshooting

### Häufige Probleme

#### Git Clone schlägt fehl
```bash
# Lösung 1: HTTPS verwenden statt SSH
git clone https://github.com/ochtii/wannfahrma-v1.git

# Lösung 2: ZIP Download
wget https://github.com/ochtii/wannfahrma-v1/archive/refs/heads/master.zip
unzip master.zip

# Lösung 3: Proxy/Firewall
export http_proxy=http://proxy:port
export https_proxy=http://proxy:port
```

#### Node.js Version zu alt

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

## 🌐 Production Setup

### Domain & DNS Konfiguration
```bash
# 1. Domain kaufen/registrieren
# Bei Provider wie Namecheap, GoDaddy, etc.

# 2. DNS A-Record erstellen
# Domain: your-domain.com
# Type: A
# Value: YOUR-SERVER-IP
# TTL: 300 (5 Minuten)

# 3. DNS propagation prüfen
dig A your-domain.com
nslookup your-domain.com

# 4. HTTP-Erreichbarkeit testen
curl -I http://your-domain.com
```

### SSL/HTTPS Setup (Automatisch)
```bash
# Das install-ubuntu.sh Script macht automatisch:
# 1. DNS-Validierung
# 2. Certbot Installation  
# 3. SSL-Zertifikat via Let's Encrypt
# 4. Nginx HTTPS-Konfiguration
# 5. Auto-Renewal Setup

# Bei Problemen manuell:
sudo certbot --nginx -d your-domain.com
```

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

#### 1. Python "externally-managed-environment" Fehler (Ubuntu 24.04+)
```bash
# Fehler: "This environment is externally managed"
error: externally-managed-environment

# Fix: Verwende apt-Pakete (automatisch in Scripts)
sudo apt install python3-pandas python3-openpyxl python3-requests python3-venv

# Oder pipx für isolated installations
sudo apt install pipx
pipx install pandas
```

#### 2. pip3 nicht gefunden
```bash
# Fix (automatisch in Scripten)
sudo apt install python3-pip
sudo ln -sf /usr/bin/pip3 /usr/bin/pip
```

#### 2. pip3 nicht gefunden
```bash
# Fix (automatisch in Scripten)
sudo apt install python3-pip
sudo ln -sf /usr/bin/pip3 /usr/bin/pip
```

#### 3. Node.js Version zu alt
```bash
# Fix (automatisch in install-ubuntu.sh)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. Node.js Version zu alt
```bash
# Fix (automatisch in install-ubuntu.sh)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 4. SSL/DNS Probleme (Production)
```bash
# Problem: "DNS problem: NXDOMAIN looking up A for domain.com"
# Ursache: DNS A-Record fehlt oder falsch

# Lösung 1: DNS A-Record prüfen
dig A your-domain.com
nslookup your-domain.com

# Lösung 2: Server IP ermitteln
curl ifconfig.me
ip addr show

# Lösung 3: DNS A-Record erstellen
# Bei Domain-Provider:
# Type: A
# Name: @ (oder subdomain)
# Value: YOUR-SERVER-IP
# TTL: 300

# Lösung 4: DNS Propagation abwarten (bis 24h)
# Online-Tools: whatsmydns.net, dnschecker.org

# Lösung 5: SSL manuell nach DNS-Fix
sudo certbot --nginx -d your-domain.com --dry-run
sudo certbot --nginx -d your-domain.com
```

#### 5. Permission Denied
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
