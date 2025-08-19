#!/bin/bash

# =============================================================================
# Environment Sync Check - PM2 vs .env
# =============================================================================

echo "🔍 Environment Synchronisation Check"
echo "===================================="
echo ""

# Check if we're in the right directory
if [[ ! -f .env ]]; then
    echo "❌ .env Datei nicht gefunden!"
    echo "Führe dieses Script im wannfahrma-v1 Verzeichnis aus"
    exit 1
fi

# Get secret from .env file
ENV_SECRET=$(grep "WEBHOOK_SECRET=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

echo "📁 Secret in .env Datei:"
if [[ -n "$ENV_SECRET" && "$ENV_SECRET" != "your-webhook-secret-here" ]]; then
    echo "   Length: ${#ENV_SECRET} Zeichen"
    echo "   Value: ${ENV_SECRET:0:8}...${ENV_SECRET: -8}"
else
    echo "   ❌ Nicht konfiguriert oder Standard-Wert"
fi

echo ""

# Check PM2 environment
echo "🔧 PM2 Prozess Environment:"
if command -v pm2 >/dev/null 2>&1; then
    PM2_ENV=$(pm2 show wannfahrma-webhook 2>/dev/null | grep -A 20 "exec mode")
    if [[ $? -eq 0 ]]; then
        echo "   ✅ PM2 Prozess gefunden"
        
        # Try to get webhook secret from PM2 process
        PM2_SECRET_INFO=$(pm2 show wannfahrma-webhook 2>/dev/null | grep "WEBHOOK_SECRET" || echo "not found")
        echo "   PM2 Environment: $PM2_SECRET_INFO"
        
        # Check if process is running
        PM2_STATUS=$(pm2 list | grep wannfahrma-webhook | awk '{print $10}')
        echo "   Status: $PM2_STATUS"
        
        # Get process uptime
        PM2_UPTIME=$(pm2 list | grep wannfahrma-webhook | awk '{print $11}')
        echo "   Uptime: $PM2_UPTIME"
        
    else
        echo "   ❌ wannfahrma-webhook Prozess nicht gefunden"
    fi
else
    echo "   ❌ PM2 nicht verfügbar"
fi

echo ""

# Solution steps
echo "🔧 Lösungsschritte:"
echo "1. PM2 Prozess mit neuer Environment neustarten:"
echo "   pm2 restart wannfahrma-webhook --update-env"
echo ""
echo "2. Oder komplett neu starten:"
echo "   pm2 stop wannfahrma-webhook"
echo "   pm2 start scripts/deployment/ecosystem-with-webhook.config.js"
echo ""
echo "3. Environment Check nach Neustart:"
echo "   pm2 show wannfahrma-webhook"
echo ""
echo "4. Webhook Test:"
echo "   curl http://localhost:3001/webhook/debug"
echo ""

# Check webhook debug endpoint
echo "🌐 Aktueller Webhook Status:"
if curl -f http://localhost:3001/webhook/debug >/dev/null 2>&1; then
    curl -s http://localhost:3001/webhook/debug | jq '.webhook_secret_length' 2>/dev/null || echo "Debug Endpoint erreichbar"
else
    echo "   ❌ Webhook Service nicht erreichbar"
fi
