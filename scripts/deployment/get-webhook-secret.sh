#!/bin/bash
# Test

# =============================================================================
# Get Webhook Secret for GitHub Configuration
# =============================================================================

echo "🔐 Webhook Secret für GitHub Repository:"
echo "========================================"
echo ""

if [[ -f .env ]]; then
    WEBHOOK_SECRET=$(grep "WEBHOOK_SECRET=" .env | cut -d'=' -f2)
    if [[ -n "$WEBHOOK_SECRET" && "$WEBHOOK_SECRET" != "your-webhook-secret-here" ]]; then
        echo "✅ Secret gefunden in .env:"
        echo ""
        echo "    $WEBHOOK_SECRET"
        echo ""
        echo "📋 GitHub Setup:"
        echo "1. Gehe zu: https://github.com/ochtii/wannfahrma-v1/settings/hooks"
        echo "2. Klicke auf den Webhook (http://18.206.241.165:3001/webhook)"
        echo "3. Scrolle zu 'Secret' Feld"
        echo "4. Ersetze den Inhalt mit:"
        echo ""
        echo "    $WEBHOOK_SECRET"
        echo ""
        echo "5. Klicke 'Update webhook'"
        echo ""
        echo "✅ Nach dem Update sollten automatische Deployments funktionieren!"
    else
        echo "❌ WEBHOOK_SECRET nicht konfiguriert oder Standard-Wert"
        echo "Führe aus: ./scripts/deployment/setup-webhook.sh"
    fi
else
    echo "❌ .env Datei nicht gefunden"
    echo "Führe aus: ./scripts/deployment/setup-webhook.sh"
fi

echo ""
echo "🧪 Test nach GitHub Update:"
echo "git add . && git commit -m 'test' && git push origin live"
