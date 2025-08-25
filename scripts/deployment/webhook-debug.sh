#!/bin/bash

# =============================================================================
# Webhook Debug Script
# =============================================================================
# Prüft die Webhook Konfiguration und Signatur-Probleme
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

print_info "🔍 Webhook Debug - Signature Problem Analysis"
echo ""

# Check if we're in the right directory
if [[ ! -f "webhook-listener.js" ]]; then
    print_error "webhook-listener.js nicht gefunden!"
    print_info "Führe dieses Script im wannfahrma-v1 Verzeichnis aus"
    exit 1
fi

# Check .env file
print_info "📋 Environment Konfiguration prüfen..."
if [[ -f .env ]]; then
    print_success ".env Datei gefunden"
    
    # Load environment variables
    # shellcheck disable=SC1091
    source .env
    
    if [[ -n "$WEBHOOK_SECRET" ]]; then
        if [[ "$WEBHOOK_SECRET" == "your-webhook-secret-here" ]]; then
            print_error "WEBHOOK_SECRET ist noch der Standard-Wert!"
            print_info "Führe ./scripts/deployment/setup-webhook.sh aus"
        else
            print_success "WEBHOOK_SECRET ist konfiguriert (${#WEBHOOK_SECRET} Zeichen)"
        fi
    else
        print_error "WEBHOOK_SECRET nicht in .env gefunden!"
    fi
else
    print_error ".env Datei nicht gefunden!"
    print_info "Führe ./scripts/deployment/setup-webhook.sh aus"
fi

echo ""

# Check if webhook service is running
print_info "🚀 Webhook Service Status..."
if curl -f http://localhost:3001/webhook/health >/dev/null 2>&1; then
    print_success "Webhook Service läuft auf Port 3001"
    
    # Get debug information
    print_info "📊 Debug Information:"
    curl -s http://localhost:3001/webhook/debug | jq '.' 2>/dev/null || curl -s http://localhost:3001/webhook/debug
else
    print_error "Webhook Service nicht erreichbar auf Port 3001"
    print_info "Starte mit: pm2 start scripts/deployment/ecosystem-with-webhook.config.js"
fi

echo ""

# Check PM2 status
print_info "🔧 PM2 Status..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 list | grep wannfahrma || print_warning "Keine wannfahrma Prozesse in PM2 gefunden"
else
    print_warning "PM2 nicht installiert"
fi

echo ""

# Test signature generation
print_info "🔐 Signature Test..."
if [[ -n "$WEBHOOK_SECRET" && "$WEBHOOK_SECRET" != "your-webhook-secret-here" ]]; then
    TEST_PAYLOAD='{"test": "payload"}'
    EXPECTED_SIG="sha256=$(echo -n "$TEST_PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)"
    
    print_info "Test Payload: $TEST_PAYLOAD"
    print_info "Expected Signature: $EXPECTED_SIG"
    
    # Test the signature with a manual request
    print_info "🧪 Teste Signature Validation..."
    
    RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:3001/webhook/test-deploy \
        -H "Content-Type: application/json" \
        -H "X-Hub-Signature-256: $EXPECTED_SIG" \
        -d "$TEST_PAYLOAD" 2>/dev/null)
    
    HTTP_CODE="${RESPONSE: -3}"
    RESPONSE_BODY="${RESPONSE%???}"
    
    if [[ "$HTTP_CODE" == "200" ]]; then
        print_success "Test Deployment erfolgreich (ohne Signature Check)"
    else
        print_error "Test Deployment fehlgeschlagen: HTTP $HTTP_CODE"
        print_info "Response: $RESPONSE_BODY"
    fi
else
    print_warning "Kann Signature Test nicht durchführen - Secret nicht konfiguriert"
fi

echo ""

# GitHub webhook configuration check
print_info "📋 GitHub Webhook Konfiguration..."
print_info "Repository: https://github.com/ochtii/wannfahrma-v1/settings/hooks"
print_info "Payload URL sollte sein: ${WEBHOOK_URL:-http://<SERVER_HOST>:3001/webhook}"
print_info "Content Type: application/json"
print_info "Secret: (der Wert aus WEBHOOK_SECRET)"
print_info "Events: Just the push event"

echo ""

# Recent webhook logs
print_info "📝 Letzte Webhook Logs..."
if [[ -f logs/webhook.log ]]; then
    print_info "Letzte 10 Zeilen aus webhook.log:"
    tail -10 logs/webhook.log
else
    print_warning "logs/webhook.log nicht gefunden"
fi

echo ""

# Troubleshooting steps
print_info "🔧 Lösungsschritte für Signature Probleme:"
echo "1. Prüfe ob WEBHOOK_SECRET in .env korrekt ist"
echo "2. Prüfe ob GitHub Webhook Secret identisch ist"
echo "3. Prüfe ob Content-Type: application/json in GitHub ist"
echo "4. Prüfe ob PM2 Prozess mit aktueller .env läuft:"
echo "   pm2 restart wannfahrma-webhook"
echo "5. Debug Endpoint prüfen:"
echo "   curl http://localhost:3001/webhook/debug"
echo "6. GitHub Webhook Test (Recent Deliveries)"

echo ""
print_success "Debug Analyse abgeschlossen!"
