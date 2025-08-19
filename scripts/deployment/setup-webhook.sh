#!/bin/bash

# =============================================================================
# GitHub Webhook Setup Script
# =============================================================================
# Konfiguriert automatische Deployments bei GitHub Push Events
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

print_info "🎣 GitHub Webhook Setup für wann fahrma OIDA"
echo ""

APP_DIR="$HOME/wannfahrma-v1"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    if [[ -d "$APP_DIR" ]]; then
        cd "$APP_DIR"
    else
        print_error "App Verzeichnis nicht gefunden: $APP_DIR"
        exit 1
    fi
fi

# Generate a secure webhook secret
print_info "🔐 Generiere Webhook Secret..."
WEBHOOK_SECRET=$(openssl rand -hex 32)
print_success "Webhook Secret generiert"

# Create .env file or update existing one
print_info "📝 Konfiguriere Environment Variables..."

# Check if .env exists
if [[ -f .env ]]; then
    print_warning ".env Datei existiert bereits"
    
    # Remove old webhook settings if they exist
    sed -i '/WEBHOOK_/d' .env
else
    touch .env
fi

# Add webhook configuration
cat >> .env <<EOF

# GitHub Webhook Configuration
WEBHOOK_PORT=3001
WEBHOOK_SECRET=${WEBHOOK_SECRET}
APP_DIR=${APP_DIR}
EOF

print_success "Environment Variables konfiguriert"

# Update firewall to allow webhook port
print_info "🛡️ Konfiguriere Firewall für Webhook Port..."
if command -v ufw >/dev/null 2>&1; then
    sudo ufw allow 3001 comment "GitHub Webhook"
    print_success "Firewall konfiguriert (Port 3001 geöffnet)"
else
    print_warning "UFW nicht verfügbar, Firewall manuell konfigurieren"
fi

# Configure Nginx for webhook (optional)
print_info "🌐 Nginx Konfiguration für Webhook..."
read -p "Nginx Reverse Proxy für Webhook konfigurieren? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Domain für Webhook (z.B. hooks.example.com): " WEBHOOK_DOMAIN
    
    if [[ -n "$WEBHOOK_DOMAIN" ]]; then
        print_info "Erstelle Nginx Konfiguration für $WEBHOOK_DOMAIN..."
        
        sudo tee /etc/nginx/sites-available/webhook > /dev/null <<EOF
server {
    listen 80;
    server_name ${WEBHOOK_DOMAIN};
    
    location /webhook {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
        
        sudo ln -sf /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        
        print_success "Nginx Konfiguration erstellt für $WEBHOOK_DOMAIN"
        WEBHOOK_URL="http://${WEBHOOK_DOMAIN}/webhook"
    else
        print_warning "Keine Domain angegeben, überspringe Nginx Setup"
        WEBHOOK_URL="http://$(curl -s ifconfig.me):3001/webhook"
    fi
else
    WEBHOOK_URL="http://$(curl -s ifconfig.me):3001/webhook"
fi

# Stop existing PM2 processes
print_info "🔄 Aktualisiere PM2 Konfiguration..."
pm2 stop wannfahrma 2>/dev/null || true
pm2 delete wannfahrma 2>/dev/null || true
pm2 delete wannfahrma-webhook 2>/dev/null || true

# Start with webhook configuration
print_info "🚀 Starte Services mit Webhook..."
pm2 start scripts/deployment/ecosystem-with-webhook.config.js
pm2 save

print_success "PM2 Services gestartet (App + Webhook)"

# Test webhook endpoint
print_info "🧪 Teste Webhook Endpoint..."
sleep 3

if curl -f http://localhost:3001/webhook/health >/dev/null 2>&1; then
    print_success "Webhook Service läuft korrekt"
else
    print_error "Webhook Service nicht erreichbar"
fi

# Show configuration summary
echo ""
echo "=================================================="
print_success "🎉 GitHub Webhook Setup abgeschlossen!"
echo "=================================================="
echo ""
print_info "🔧 Konfiguration:"
echo "   Webhook URL: $WEBHOOK_URL"
echo "   Webhook Secret: $WEBHOOK_SECRET"
echo "   Target Branch: live"
echo "   App Directory: $APP_DIR"
echo ""
print_info "📋 GitHub Repository Setup:"
echo "   1. Gehe zu: https://github.com/ochtii/wannfahrma-v1/settings/hooks"
echo "   2. Klicke 'Add webhook'"
echo "   3. Payload URL: $WEBHOOK_URL"
echo "   4. Content type: application/json"
echo "   5. Secret: $WEBHOOK_SECRET"
echo "   6. Events: Just the push event"
echo "   7. Active: ✓"
echo ""
print_info "🎯 So funktioniert es:"
echo "   • Push zu 'live' branch → Automatisches Deployment"
echo "   • Push zu 'master/main' → Keine Aktion"
echo "   • Deployment: git pull → npm install → PM2 restart"
echo ""
print_info "📊 Monitoring:"
echo "   • Webhook Status: curl $WEBHOOK_URL/health"
echo "   • PM2 Status: pm2 status"
echo "   • Logs: pm2 logs wannfahrma-webhook"
echo "   • Webhook Logs: tail -f logs/webhook.log"
echo ""
print_info "🔧 Manual Deployment Test:"
echo "   curl -X POST $WEBHOOK_URL/deploy \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -H 'X-Hub-Signature-256: sha256=...' \\"
echo "        -d '{}'"
echo ""

# Show PM2 status
print_info "📊 Aktuelle PM2 Services:"
pm2 status

echo ""
print_warning "⚠️  Wichtige Hinweise:"
echo "   • Webhook Secret sicher aufbewahren!"
echo "   • GitHub Webhook konfigurieren (siehe oben)"
echo "   • Firewall Port 3001 ist geöffnet"
echo "   • Nur 'live' Branch triggert Deployments"
echo ""

print_success "🚀 Bereit für automatische Deployments!"
