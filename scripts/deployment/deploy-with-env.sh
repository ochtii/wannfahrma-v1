#!/bin/bash
# Deployment-Skript für die Warten is ORG Anwendung
# Dieses Skript setzt korrekt die Umgebungsvariablen für den Server

# Stoppen Sie zuerst den laufenden Dienst (wenn vorhanden)
echo "📋 Stoppe den laufenden Dienst..."
if command -v pm2 &> /dev/null; then
    pm2 stop warten-is-org || true
elif systemctl is-active --quiet warten-is-org.service; then
    sudo systemctl stop warten-is-org.service
fi

# Aktualisieren des Codes (wenn Git verwendet wird)
echo "📋 Code aktualisieren..."
git pull

# NPM-Abhängigkeiten installieren
echo "📋 NPM-Abhängigkeiten installieren..."
npm install

# Umgebungsvariablen aus .env laden und exportieren
echo "📋 Umgebungsvariablen laden..."
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✅ Umgebungsvariablen aus .env geladen"
    
    # Debug-Ausgabe der wichtigsten Variablen
    echo "🔍 Überprüfe kritische Umgebungsvariablen:"
    if [ -n "$SUPABASE_URL" ]; then
        echo "✓ SUPABASE_URL ist gesetzt"
    else
        echo "❌ SUPABASE_URL ist NICHT gesetzt!"
    fi
    
    if [ -n "$SUPABASE_ANON_KEY" ]; then
        echo "✓ SUPABASE_ANON_KEY ist gesetzt"
    else
        echo "❌ SUPABASE_ANON_KEY ist NICHT gesetzt!"
    fi
else
    echo "❌ .env Datei nicht gefunden!"
    exit 1
fi

# PM2 Ecosystem-Datei mit Umgebungsvariablen erstellen
echo "📋 PM2 Ecosystem-Datei erstellen..."
cat > ecosystem.config.js <<EOL
module.exports = {
  apps: [{
    name: "warten-is-org",
    script: "server.js",
    env: {
      NODE_ENV: "${NODE_ENV:-production}",
      PORT: ${PORT:-3000},
      HOST: "${HOST:-0.0.0.0}",
      SUPABASE_URL: "${SUPABASE_URL}",
      SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
      API_BASE_URL: "${API_BASE_URL}",
      DEBUG: "${DEBUG:-false}",
      LOG_LEVEL: "${LOG_LEVEL:-info}",
      LOG_FILE: "${LOG_FILE:-./logs/api_logs.log}"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    combine_logs: true
  }]
}
EOL

# Starten der Anwendung mit PM2
echo "📋 Anwendung mit PM2 starten..."
if command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Anwendung gestartet mit PM2"
else
    echo "❌ PM2 ist nicht installiert! Installiere es mit: npm install -g pm2"
    exit 1
fi

# Überprüfen, ob die Anwendung läuft
echo "📋 Überprüfe, ob die Anwendung läuft..."
sleep 3
if pm2 list | grep -q "warten-is-org.*online"; then
    echo "✅ Anwendung läuft!"
else
    echo "❌ Anwendung konnte nicht gestartet werden. Überprüfen Sie die Logs:"
    pm2 logs warten-is-org --lines 30
    exit 1
fi

echo "🎉 Deployment abgeschlossen!"
echo "💡 Zugriff auf die Anwendung: http://localhost:${PORT:-3000}"
