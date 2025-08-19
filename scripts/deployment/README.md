# 🚀 Deployment Scripts

Automatisierte Deployment-Tools für wann fahrma OIDA.

## 📁 Enthaltene Dateien

### `deploy.sh` - Production Deployment Script
Automatisiertes Deployment auf dem Production Server mit:
- Git-basiertes Update System
- Dependency Management  
- PM2 Process Management
- Automatischer Rollback bei Fehlern
- Health Check nach Deployment

### `ecosystem.config.js` - PM2 Konfiguration
PM2 Process Manager Konfiguration für:
- Production-optimierte Settings
- Automatic Restart bei Crashes
- Memory Management (1GB Limit)
- Structured Logging
- Environment Variables

## 🚀 Verwendung

### Production Deployment
```bash
# Deployment ausführen
cd /path/to/wannfahrma-v1
chmod +x scripts/deployment/deploy.sh
./scripts/deployment/deploy.sh
```

### PM2 Process Management
```bash
# App mit ecosystem.config.js starten
pm2 start scripts/deployment/ecosystem.config.js

# Status überprüfen
pm2 status wannfahrma

# Logs anzeigen  
pm2 logs wannfahrma

# App stoppen
pm2 stop wannfahrma

# App neu starten
pm2 restart wannfahrma

# PM2 bei System-Boot aktivieren
pm2 startup
pm2 save
```

## ⚙️ Konfiguration

### Environment Variables
Das ecosystem.config.js verwendet diese Umgebungsvariablen:

```bash
# .env Datei
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### PM2 Konfiguration Anpassen
Bearbeiten Sie `ecosystem.config.js` für:
- Anzahl Instanzen (`instances`)
- Memory Limit (`max_memory_restart`)
- Logs Pfade (`error_file`, `out_file`)
- Environment Variables (`env`)

## 🔄 Deployment Workflow

### 1. Automatisches Deployment
```bash
./scripts/deployment/deploy.sh
```

**Was passiert:**
1. 📦 Backup erstellen
2. 🔍 Git Updates prüfen
3. 📥 Code aktualisieren (`git pull`)
4. 📦 Dependencies installieren (`npm ci`)
5. 🔄 App neu starten (PM2)
6. ✅ Health Check
7. 🚨 Rollback bei Fehlern

### 2. Manuelles Deployment
```bash
cd /path/to/wannfahrma-v1

# Code aktualisieren
git pull origin main

# Dependencies installieren
npm ci --production

# App neu starten
pm2 restart wannfahrma

# Status prüfen
pm2 status
```

## 🛠️ Troubleshooting

### App startet nicht
```bash
# Logs überprüfen
pm2 logs wannfahrma

# PM2 Status
pm2 status

# Process restarten
pm2 restart wannfahrma
```

### Deployment fehlgeschlagen
```bash
# Backup wiederherstellen (automatisch bei deploy.sh)
# Oder manuell:
pm2 stop wannfahrma
cd ~
rm -rf wannfahrma-v1
mv backups/wannfahrma-[timestamp] wannfahrma-v1
cd wannfahrma-v1
pm2 start scripts/deployment/ecosystem.config.js
```

### Performance Probleme
```bash
# Memory Usage prüfen
pm2 monit

# Restart bei Memory Issues
pm2 restart wannfahrma

# Logs für Errors prüfen
pm2 logs wannfahrma --err
```

## 📊 Monitoring

### PM2 Dashboard
```bash
# Real-time monitoring
pm2 monit

# Process Liste
pm2 list

# Detailed Info
pm2 show wannfahrma
```

### Log Management
```bash
# Live Logs
pm2 logs wannfahrma --lines 100

# Log Rotation (automatisch konfiguriert)
pm2 install pm2-logrotate

# Log Files bereinigen
pm2 flush wannfahrma
```

## 🔒 Sicherheit

### Pre-Deployment Checks
```bash
# Security Check vor Deployment
./scripts/security/security-check.sh

# Git Status prüfen
git status
git log --oneline -10
```

### Firewall (Ubuntu)
```bash
# Port 3000 für lokale App
sudo ufw allow 3000

# Nginx als Reverse Proxy (empfohlen)
sudo ufw allow 'Nginx Full'
```

---

📞 **Support**: Bei Deployment-Problemen siehe [`../docs/README.md`](../docs/README.md) oder erstellen Sie ein GitHub Issue.
