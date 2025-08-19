# PowerShell Webhook Debug Script für Windows

function Write-Info { param([string]$Message) Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "SUCCESS: $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "WARNING: $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "ERROR: $Message" -ForegroundColor Red }

Write-Info "🔍 Webhook Debug - Signature Problem Analysis"
Write-Host ""

# Check if webhook-listener.js exists
if (-not (Test-Path "webhook-listener.js")) {
    Write-Error "webhook-listener.js nicht gefunden!"
    Write-Info "Führe dieses Script im wannfahrma-v1 Verzeichnis aus"
    exit 1
}

# Check .env file
Write-Info "📋 Environment Konfiguration prüfen..."
if (Test-Path ".env") {
    Write-Success ".env Datei gefunden"
    
    # Read .env file
    $envContent = Get-Content ".env" | Where-Object { $_ -match "WEBHOOK_SECRET=" }
    if ($envContent) {
        $webhookSecret = ($envContent -split "=")[1]
        if ($webhookSecret -eq "your-webhook-secret-here") {
            Write-Error "WEBHOOK_SECRET ist noch der Standard-Wert!"
            Write-Info "Führe .\scripts\deployment\setup-webhook-windows.ps1 aus"
        } else {
            Write-Success "WEBHOOK_SECRET ist konfiguriert ($($webhookSecret.Length) Zeichen)"
        }
    } else {
        Write-Error "WEBHOOK_SECRET nicht in .env gefunden!"
    }
} else {
    Write-Error ".env Datei nicht gefunden!"
    Write-Info "Führe .\scripts\deployment\setup-webhook-windows.ps1 aus"
}

Write-Host ""

# Check if webhook service is running locally
Write-Info "🚀 Lokaler Webhook Service Status..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/webhook/health" -Method Get -TimeoutSec 5
    Write-Success "Lokaler Webhook Service läuft auf Port 3001"
    
    # Get debug information
    Write-Info "📊 Debug Information:"
    $debugResponse = Invoke-RestMethod -Uri "http://localhost:3001/webhook/debug"
    $debugResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Warning "Lokaler Webhook Service nicht erreichbar auf Port 3001"
    Write-Info "Starte mit: node webhook-listener.js"
}

Write-Host ""

# Check production webhook service
Write-Info "🌐 Produktions Webhook Service Status..."
try {
    $response = Invoke-WebRequest -Uri "http://18.206.241.165:3001/webhook/health" -Method Get -TimeoutSec 10
    Write-Success "Produktions Webhook Service erreichbar"
    
    # Get debug information
    Write-Info "📊 Produktions Debug Information:"
    $debugResponse = Invoke-RestMethod -Uri "http://18.206.241.165:3001/webhook/debug"
    $debugResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Error "Produktions Webhook Service nicht erreichbar"
    Write-Info "Server möglicherweise offline oder Firewall blockiert Port 3001"
}

Write-Host ""

# Test signature generation
Write-Info "🔐 Signature Test..."
if ($webhookSecret -and $webhookSecret -ne "your-webhook-secret-here") {
    $testPayload = '{"test": "payload"}'
    
    # PowerShell HMAC-SHA256 generation
    $hmacsha = New-Object System.Security.Cryptography.HMACSHA256
    $hmacsha.key = [Text.Encoding]::UTF8.GetBytes($webhookSecret)
    $signature = [System.BitConverter]::ToString($hmacsha.ComputeHash([Text.Encoding]::UTF8.GetBytes($testPayload))).Replace('-','').ToLower()
    $expectedSig = "sha256=$signature"
    
    Write-Info "Test Payload: $testPayload"
    Write-Info "Expected Signature: $expectedSig"
    
    # Test the signature with a manual request (if local service is running)
    try {
        Write-Info "🧪 Teste lokalen Test-Endpoint..."
        $headers = @{
            "Content-Type" = "application/json"
            "X-Hub-Signature-256" = $expectedSig
        }
        $testResponse = Invoke-RestMethod -Uri "http://localhost:3001/webhook/test-deploy" -Method Post -Headers $headers -Body $testPayload
        Write-Success "Test Deployment erfolgreich (ohne Signature Check)"
        Write-Info "Response: $($testResponse | ConvertTo-Json)"
    } catch {
        Write-Warning "Test Deployment fehlgeschlagen: $($_.Exception.Message)"
    }
} else {
    Write-Warning "Kann Signature Test nicht durchführen - Secret nicht konfiguriert"
}

Write-Host ""

# GitHub webhook configuration info
Write-Info "📋 GitHub Webhook Konfiguration..."
Write-Info "Repository: https://github.com/ochtii/wannfahrma-v1/settings/hooks"
Write-Info "Payload URL sollte sein: http://18.206.241.165:3001/webhook"
Write-Info "Content Type: application/json"
Write-Info "Secret: (der Wert aus WEBHOOK_SECRET)"
Write-Info "Events: Just the push event"

Write-Host ""

# Recent webhook logs (if available)
Write-Info "📝 Lokale Logs prüfen..."
if (Test-Path "logs\webhook.log") {
    Write-Info "Letzte 10 Zeilen aus webhook.log:"
    Get-Content "logs\webhook.log" -Tail 10
} else {
    Write-Warning "logs\webhook.log nicht gefunden"
}

Write-Host ""

# Troubleshooting steps
Write-Info "🔧 Lösungsschritte für Signature Probleme:"
Write-Host "1. Prüfe ob WEBHOOK_SECRET in .env korrekt ist"
Write-Host "2. Prüfe ob GitHub Webhook Secret identisch ist"
Write-Host "3. Prüfe ob Content-Type: application/json in GitHub ist"
Write-Host "4. Prüfe ob Webhook Service mit aktueller .env läuft"
Write-Host "5. Debug Endpoint prüfen:"
Write-Host "   Invoke-RestMethod -Uri 'http://18.206.241.165:3001/webhook/debug'"
Write-Host "6. GitHub Webhook Test (Recent Deliveries)"
Write-Host "7. Test ohne Signature:"
Write-Host "   Invoke-RestMethod -Uri 'http://18.206.241.165:3001/webhook/test-deploy' -Method Post -ContentType 'application/json' -Body '{}'"

Write-Host ""
Write-Success "🚀 Debug Analyse abgeschlossen!"
