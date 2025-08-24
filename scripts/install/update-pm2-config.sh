#!/bin/bash

# =============================================================================
# Warten is ORG - PM2 Configuration Update Script
# =============================================================================
# Aktualisiert bestehende PM2 Konfiguration auf neue Pfad-Struktur
# =============================================================================

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

print_info "🔄 PM2 Konfiguration Update für Warten is ORG"
echo ""

APP_DIR="$HOME/wannfahrma-v1"

# Check if we're in the app directory
if [[ ! -f "package.json" ]]; then
    if [[ -d "$APP_DIR" ]]; then
        cd "$APP_DIR"
    else
        print_error "App Verzeichnis nicht gefunden: $APP_DIR"
        exit 1
    fi
fi

# Check current PM2 status
print_info "Prüfe aktuelle PM2 Konfiguration..."

PM2_RUNNING=false
if command -v pm2 >/dev/null 2>&1; then
    if pm2 show wannfahrma >/dev/null 2>&1; then
        PM2_RUNNING=true
        print_warning "PM2 Process 'wannfahrma' läuft bereits"
    else
        print_info "Kein PM2 Process 'wannfahrma' gefunden"
    fi
else
    print_warning "PM2 nicht installiert"
fi

# Check for old ecosystem.config.js in root
if [[ -f "ecosystem.config.js" ]]; then
    print_warning "Alte ecosystem.config.js im Root-Verzeichnis gefunden"
    
    # Stop PM2 if running
    if [[ "$PM2_RUNNING" = true ]]; then
        print_info "Stoppe bestehenden PM2 Process..."
        pm2 stop wannfahrma
        pm2 delete wannfahrma
    fi
    
    # Move old config to new location
    mkdir -p scripts/deployment
    if [[ ! -f scripts/deployment/ecosystem.config.js ]]; then
        print_info "Verschiebe ecosystem.config.js nach scripts/deployment/"
        mv ecosystem.config.js scripts/deployment/
        print_success "Konfiguration verschoben"
    else
        print_warning "Neue Konfiguration existiert bereits"
        read -p "Alte Konfiguration löschen? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm ecosystem.config.js
            print_success "Alte Konfiguration entfernt"
        else
            mv ecosystem.config.js ecosystem.config.js.backup
            print_success "Alte Konfiguration als backup gespeichert"
        fi
    fi
fi

# Ensure new config exists
if [[ ! -f scripts/deployment/ecosystem.config.js ]]; then
    print_info "Erstelle neue ecosystem.config.js..."
    mkdir -p scripts/deployment
    cat > scripts/deployment/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'wannfahrma',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
    print_success "Neue ecosystem.config.js erstellt"
fi

# Update management scripts
print_info "Aktualisiere Management Scripts..."

# Update start.sh
cat > start.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
pm2 start scripts/deployment/ecosystem.config.js
pm2 save
echo "✅ Warten is ORG gestartet"
EOF

# Update stop.sh
cat > stop.sh <<'EOF'
#!/bin/bash
pm2 stop wannfahrma
echo "⏹️  Warten is ORG gestoppt"
EOF

# Update restart.sh
cat > restart.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
pm2 restart wannfahrma
echo "🔄 Warten is ORG neu gestartet"
EOF

# Update status.sh
cat > status.sh <<'EOF'
#!/bin/bash
echo "📊 Warten is ORG Status:"
pm2 status wannfahrma
echo ""
echo "📈 Logs (letzte 20 Zeilen):"
pm2 logs wannfahrma --lines 20
EOF

# Update update.sh
cat > update.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "🔄 Update Warten is ORG..."
git pull
npm install
pm2 restart wannfahrma
echo "✅ Update abgeschlossen"
EOF

chmod +x *.sh
print_success "Management Scripts aktualisiert"

# Create logs directory
mkdir -p logs

# Start with new configuration
print_info "Starte Anwendung mit neuer Konfiguration..."

if pm2 start scripts/deployment/ecosystem.config.js; then
    pm2 save
    print_success "🎉 PM2 erfolgreich mit neuer Konfiguration gestartet!"
    
    echo ""
    print_info "Verfügbare Management Commands:"
    echo "  ./start.sh    - App starten"
    echo "  ./stop.sh     - App stoppen"
    echo "  ./restart.sh  - App neu starten"
    echo "  ./status.sh   - Status anzeigen"
    echo "  ./update.sh   - App aktualisieren"
    echo ""
    
    # Show status
    pm2 status wannfahrma
else
    print_error "❌ PM2 Start fehlgeschlagen!"
    print_info "Debugging-Schritte:"
    echo "  1. Überprüfe Konfiguration: cat scripts/deployment/ecosystem.config.js"
    echo "  2. Teste Node.js: node server.js"
    echo "  3. Überprüfe Logs: pm2 logs wannfahrma"
    echo "  4. PM2 neu starten: pm2 kill && pm2 start scripts/deployment/ecosystem.config.js"
    
    exit 1
fi

print_success "✅ Update abgeschlossen!"
