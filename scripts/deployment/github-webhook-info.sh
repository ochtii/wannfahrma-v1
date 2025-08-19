#!/bin/bash

# =============================================================================
# GitHub Webhook Quick Configuration
# =============================================================================
# Zeigt alle notwendigen Informationen für GitHub Webhook Setup
# =============================================================================

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() { echo -e "${BOLD}${BLUE}$1${NC}"; }
print_info() { echo -e "${CYAN}$1${NC}"; }
print_success() { echo -e "${GREEN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }

# Check if .env exists
if [[ ! -f .env ]]; then
    print_error "❌ .env Datei nicht gefunden!"
    print_info "Führe zuerst aus: ./scripts/deployment/setup-webhook.sh"
    exit 1
fi

# Load environment variables
source .env

# Get server IP
SERVER_IP="18.206.241.165"

# Check if webhook service is running
WEBHOOK_RUNNING=false
if curl -f http://localhost:3001/webhook/health >/dev/null 2>&1; then
    WEBHOOK_RUNNING=true
fi

# Set webhook URL
WEBHOOK_URL_DISPLAY="http://18.206.241.165:3001/webhook"

clear
echo "=================================================="
print_header "🎣 GitHub Webhook Konfiguration"
echo "=================================================="
echo ""

# Show current status
print_header "📊 Status Check"
echo "   Server IP: $SERVER_IP"
echo "   Webhook Port: 3001"

if [ "$WEBHOOK_RUNNING" = true ]; then
    print_success "   ✅ Webhook Service läuft"
else
    print_error "   ❌ Webhook Service nicht erreichbar"
    echo "      Starte mit: pm2 start scripts/deployment/ecosystem-with-webhook.config.js"
fi

echo ""

# GitHub webhook configuration
print_header "🔧 GitHub Repository Setup"
echo ""
print_info "1. Öffne in Browser:"
echo "   ${BOLD}https://github.com/ochtii/wannfahrma-v1/settings/hooks${NC}"
echo ""

print_info "2. Klicke: ${BOLD}'Add webhook'${NC}"
echo ""

print_info "3. Webhook konfigurieren:"
echo ""
echo "   📍 ${BOLD}Payload URL:${NC}"
echo "      $WEBHOOK_URL_DISPLAY"
echo ""
echo "   📦 ${BOLD}Content type:${NC}"
echo "      application/json"
echo ""
echo "   🔐 ${BOLD}Secret:${NC}"
if [[ -n "$WEBHOOK_SECRET" ]]; then
    echo "      $WEBHOOK_SECRET"
else
    print_error "      ❌ WEBHOOK_SECRET nicht in .env gefunden!"
fi
echo ""
echo "   🎯 ${BOLD}Which events would you like to trigger this webhook?${NC}"
echo "      ○ Just the push event"
echo ""
echo "   ✅ ${BOLD}Active:${NC}"
echo "      ☑ Checked"
echo ""

print_info "4. Klicke: ${BOLD}'Add webhook'${NC}"
echo ""

# Branch workflow
print_header "🚀 Deployment Workflow"
echo ""
print_info "Automatisches Deployment (live branch):"
echo "   git checkout live"
echo "   git add ."
echo "   git commit -m 'Update'"
echo "   git push origin live"
print_success "   → Server wird automatisch aktualisiert! 🎉"
echo ""

print_info "Keine Deployment Aktion (master/main):"
echo "   git checkout master"
echo "   git push origin master"
print_warning "   → Keine Server-Änderung"
echo ""

# Testing
print_header "🧪 Webhook Testing"
echo ""
print_info "Health Check:"
echo "   curl $WEBHOOK_URL_DISPLAY/health"
echo ""

print_info "Manual Deployment Test:"
echo "   curl -X POST $WEBHOOK_URL_DISPLAY/deploy \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{}'"
echo ""

print_info "GitHub Webhook Test:"
echo "   • Gehe zu: Repository → Settings → Webhooks"
echo "   • Klicke auf den erstellten Webhook"
echo "   • Unter 'Recent Deliveries' → 'Redeliver'"
echo ""

# Monitoring
print_header "📊 Monitoring & Logs"
echo ""
print_info "PM2 Status:"
echo "   pm2 status"
echo ""

print_info "Webhook Logs:"
echo "   pm2 logs wannfahrma-webhook"
echo ""

print_info "Deployment Logs:"
echo "   tail -f logs/webhook.log"
echo ""

# Security notes
print_header "🔒 Sicherheitshinweise"
echo ""
print_warning "⚠️  Webhook Secret sicher aufbewahren!"
print_warning "⚠️  Port 3001 ist öffentlich zugänglich"
print_info "💡 Für Produktion: Nginx Reverse Proxy mit SSL verwenden"
echo ""

# Quick commands
print_header "⚡ Quick Commands"
echo ""
echo "PM2 Services neustarten:"
echo "   pm2 restart all"
echo ""
echo "Webhook Service einzeln neustarten:"
echo "   pm2 restart wannfahrma-webhook"
echo ""
echo "Environment neu laden:"
echo "   source .env"
echo ""

# Copy-paste ready configuration
print_header "📋 Copy-Paste Konfiguration für GitHub"
echo ""
echo "=================================================="
print_success "Payload URL:"
echo "http://18.206.241.165:3001/webhook"
echo ""
print_success "Secret:"
echo "${WEBHOOK_SECRET:-FEHLT}"
echo ""
print_success "Content Type:"
echo "application/json"
echo ""
print_success "Events:"
echo "Just the push event"
echo "=================================================="
echo ""

print_success "🎉 Bereit für automatische Deployments!"
print_info "Nach dem GitHub Setup: Push zu 'live' branch zum Testen"
