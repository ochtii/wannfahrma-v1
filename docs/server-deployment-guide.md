# Deployment Guide für Warten is ORG

Diese Anleitung hilft bei der korrekten Einrichtung der Anwendung auf einem Produktionsserver.

## 1. Umgebungsvariablen einrichten

Die `.env` Datei enthält wichtige Konfigurationen. Stellen Sie sicher, dass diese Datei korrekt eingerichtet ist.

### Wichtig: Umgebungsvariablen für Server und systemd

Bei Verwendung von systemd oder PM2 als Prozess-Manager, müssen die Umgebungsvariablen direkt verfügbar gemacht werden. 
Es gibt drei Möglichkeiten:

#### Option 1: Umgebungsvariablen in der systemd Service-Datei

```ini
[Unit]
Description=Warten is ORG App
After=network.target

[Service]
Type=simple
User=username
WorkingDirectory=/pfad/zur/app
ExecStart=/usr/bin/node server.js
Restart=on-failure

# Umgebungsvariablen hier einfügen
Environment="NODE_ENV=production"
Environment="SUPABASE_URL=https://wjzfcanojeauhjpgaydg.supabase.co"
Environment="SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqemZjYW5vamVhdWhqcGdheWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mzk0MjEsImV4cCI6MjA3MTAxNTQyMX0.MB6FuLQ4ECESPgahc4sBcaoQv23zahlTehIVbEtcyzs"

[Install]
WantedBy=multi-user.target
```

#### Option 2: PM2 mit Umgebungsvariablen

Erstellen Sie eine PM2-Konfigurationsdatei `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: "warten-is-org",
    script: "server.js",
    env: {
      NODE_ENV: "production",
      SUPABASE_URL: "https://wjzfcanojeauhjpgaydg.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqemZjYW5vamVhdWhqcGdheWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mzk0MjEsImV4cCI6MjA3MTAxNTQyMX0.MB6FuLQ4ECESPgahc4sBcaoQv23zahlTehIVbEtcyzs"
    }
  }]
}
```

Starten mit: `pm2 start ecosystem.config.js`

#### Option 3: Source .env vor dem Start

```bash
source /pfad/zur/.env
node server.js
```

## 2. Server-Einrichtung

### Node.js Version

Stellen Sie sicher, dass Sie Node.js 16 oder höher verwenden:

```bash
node -v
# Sollte v16.x.x oder höher anzeigen
```

### Benötigte NPM-Pakete installieren

```bash
npm install
```

### Firewall-Einstellungen

Öffnen Sie Port 3000 (oder den konfigurierten Port) in Ihrer Firewall:

```bash
sudo ufw allow 3000
```

## 3. Fehlersuche bei Supabase-Verbindungsproblemen

Wenn Supabase-Authentifizierung nicht funktioniert, überprüfen Sie:

1. **Umgebungsvariablen**: Sind `SUPABASE_URL` und `SUPABASE_ANON_KEY` korrekt gesetzt?
   
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   ```

2. **Server-Logs**: Überprüfen Sie die Server-Logs auf Fehlermeldungen:
   
   ```bash
   tail -f logs/api_logs.log
   ```

3. **Browser-Konsole**: Prüfen Sie die Browser-Konsole auf Fehler bei der Initialisierung von Supabase.

4. **CORS-Einstellungen**: Prüfen Sie, ob CORS in Ihrem Supabase-Projekt korrekt konfiguriert ist.
   - Öffnen Sie die Supabase-Konsole
   - Gehen Sie zu Authentication > URL Configuration
   - Fügen Sie Ihre Domain zu den erlaubten URLs hinzu

5. **Netzwerkzugriff**: Stellen Sie sicher, dass Ihr Server auf supabase.co zugreifen kann.

## 4. Debug-Modus aktivieren

Um detailliertere Protokollierung zu aktivieren, ändern Sie die Umgebungsvariable:

```bash
export DEBUG=true
export LOG_LEVEL=debug
```

Oder in der .env Datei:
```
DEBUG=true
LOG_LEVEL=debug
```

## 5. Best Practices für die Produktion

- **HTTPS**: Verwenden Sie einen Reverse-Proxy wie Nginx mit HTTPS
- **Monitoring**: Nutzen Sie PM2 oder andere Tools zum Monitoring
- **Regelmäßige Backups**: Sichern Sie Ihre Datenbanken
- **Log-Rotation**: Konfigurieren Sie log-rotate für die Protokolldateien

## 6. Kontakt und Support

Bei Problemen oder Fragen wenden Sie sich an:
- GitHub Issues: [https://github.com/ochtii/wannfahrma-v1/issues](https://github.com/ochtii/wannfahrma-v1/issues)
