# 🚇 wann fahrma OIDA - Ubuntu Server Installation

Automatisches Installationsskript für Ubuntu Server 20.04+ 

## 🚀 Installationsoptionen

### Option 1: Schnellinstallation (Empfohlen für Tests)
```bash
# Einfache Installation mit Fehlerbehebungen
chmod +x install-quick.sh
./install-quick.sh
```

### Option 2: Vollständige Installation
```bash
# Komplette Installation mit Nginx, SSL, etc.
chmod +x install-ubuntu.sh
./install-ubuntu.sh
```

### Option 3: Test vor Installation
```bash
# System-Check vor Installation
chmod +x test-install.sh
./test-install.sh
```

## 🔧 Häufige Probleme & Lösungen

### pip3 command not found
```bash
# Problem: pip3 nicht gefunden
# Lösung 1: Neuinstallation
sudo apt install python3-pip

# Lösung 2: Symlink erstellen
sudo ln -sf $(which pip) /usr/local/bin/pip3

# Lösung 3: python3 -m pip verwenden
python3 -m pip install --user pandas openpyxl requests
```

### bc command not found
```bash
# Problem: bc nicht verfügbar für Versionsvergleich
# Lösung: Installiere bc oder verwende alternative Methode
sudo apt install bc
```

### Node.js Repository nicht erreichbar
```bash
# Problem: NodeSource Repository blockiert
# Lösung 1: Alternative Installation über snap
sudo snap install node --classic

# Lösung 2: Über Ubuntu Repository (ältere Version)
sudo apt install nodejs npm

# Lösung 3: Manueller Download
wget https://nodejs.org/dist/v18.18.0/node-v18.18.0-linux-x64.tar.xz
```

### Permission denied Fehler
```bash
# Problem: Nicht als root ausführen
# Script als normaler Benutzer starten:
whoami  # Sollte nicht 'root' zeigen
./install-ubuntu.sh
```

## 📋 Was wird installiert?

### System-Komponenten
- **Node.js** (LTS) - JavaScript Runtime
- **Python3** - Für Datenverarbeitung 
- **PM2** - Process Manager für Node.js
- **Nginx** - Reverse Proxy (optional)
- **UFW Firewall** - Sicherheit
- **Let's Encrypt** - SSL Zertifikate (optional)

### Application Setup
- Repository klonen nach `~/wannfahrma-v1`
- NPM Dependencies installieren
- .env Konfigurationsdatei erstellen
- PM2 Prozess konfigurieren
- Service Scripts erstellen

## 🛠️ Management Scripts

Nach der Installation stehen folgende Scripts zur Verfügung:

```bash
./start.sh      # Anwendung starten
./stop.sh       # Anwendung stoppen  
./restart.sh    # Anwendung neu starten
./status.sh     # Status und Logs anzeigen
./update.sh     # Update auf neueste Version
```

## 🌐 Zugriff

- **Lokal**: http://localhost:3000
- **Netzwerk**: http://server-ip:3000
- **Web**: http://domain.com (mit Nginx)

## 🔧 Konfiguration

### .env Datei anpassen
```bash
cd ~/wannfahrma-v1
nano .env
```

Wichtige Einstellungen:
- `PORT` - Server Port (Standard: 3000)
- `NODE_ENV` - Environment (production/development)
- `API_TIMEOUT` - API Timeout in ms
- `RATE_LIMIT_MAX_REQUESTS` - Rate Limiting

### PM2 Konfiguration
```bash
# Status anzeigen
pm2 status

# Logs anzeigen
pm2 logs wannfahrma

# Neustart
pm2 restart wannfahrma

# PM2 Monitoring
pm2 monit
```

### Nginx Konfiguration
```bash
# Nginx Status
sudo systemctl status nginx

# Konfiguration testen
sudo nginx -t

# Nginx neu laden
sudo systemctl reload nginx

# Logs
sudo tail -f /var/log/nginx/access.log
```

## 🔒 SSL/HTTPS einrichten

```bash
# Let's Encrypt installieren (falls nicht im Skript gemacht)
sudo apt install certbot python3-certbot-nginx

# SSL Zertifikat erstellen
sudo certbot --nginx -d ihre-domain.com

# Automatische Erneuerung testen
sudo certbot renew --dry-run
```

## 🔥 Firewall

Das Skript konfiguriert UFW automatisch:

```bash
# Firewall Status
sudo ufw status

# Zusätzliche Ports öffnen
sudo ufw allow 8080/tcp

# Regel entfernen
sudo ufw delete allow 8080/tcp
```

Standard-Regeln:
- SSH (22) - Erlaubt
- HTTP (80) - Erlaubt
- HTTPS (443) - Erlaubt
- Node.js (3000) - Nur wenn kein Nginx

## 📊 Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# CPU/Memory usage
pm2 describe wannfahrma

# Restart bei hoher Memory-Nutzung
pm2 set pm2:autodump true
```

### System Monitoring
```bash
# Server Resources
htop
df -h
free -h

# Network
netstat -tulpn | grep :3000
```

## 🔄 Updates

### Automatisches Update
```bash
./update.sh
```

### Manuelles Update
```bash
cd ~/wannfahrma-v1
git pull
npm install
pm2 restart wannfahrma
```

## 🐛 Troubleshooting

### Anwendung startet nicht
```bash
# Logs prüfen
pm2 logs wannfahrma

# PM2 Status
pm2 status

# Port-Konflikte prüfen
sudo netstat -tulpn | grep :3000
```

### Nginx Probleme
```bash
# Nginx Status
sudo systemctl status nginx

# Konfiguration testen
sudo nginx -t

# Error Logs
sudo tail -f /var/log/nginx/error.log
```

### Firewall Probleme
```bash
# UFW Status
sudo ufw status verbose

# Temporarily disable
sudo ufw disable

# Re-enable
sudo ufw enable
```

## 📁 Verzeichnisstruktur

```
~/wannfahrma-v1/
├── server.js              # Hauptserver
├── app.js                 # Frontend Logik  
├── index.html             # Frontend
├── package.json           # NPM Dependencies
├── .env                   # Konfiguration
├── ecosystem.config.js    # PM2 Konfiguration
├── logs/                  # Log Dateien
├── start.sh              # Start Script
├── stop.sh               # Stop Script
├── restart.sh            # Restart Script
├── status.sh             # Status Script
└── update.sh             # Update Script
```

## 🆘 Support

### Log Dateien
- **PM2**: `pm2 logs wannfahrma`
- **Nginx**: `/var/log/nginx/error.log`
- **System**: `/var/log/syslog`

### Häufige Probleme

1. **Port bereits in Verwendung**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **Permissions Probleme**
   ```bash
   sudo chown -R $USER:$USER ~/wannfahrma-v1
   ```

3. **NPM Probleme**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## 🎯 Performance Tuning

### PM2 Cluster Mode
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'wannfahrma',
    script: 'server.js',
    instances: 'max',  // Nutzt alle CPU Kerne
    exec_mode: 'cluster'
  }]
};
```

### Nginx Caching
```nginx
# /etc/nginx/sites-available/wannfahrma
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

🚇 **Happy Transit Tracking!** 

Für weitere Hilfe siehe [GitHub Issues](https://github.com/ochtii/wannfahrma-v1/issues)
