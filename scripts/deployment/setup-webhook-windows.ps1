# PowerShell script for Windows development environment
# GitHub Webhook Setup für lokale Entwicklung

param(
    [string]$WebhookSecret = "",
    [int]$Port = 3001
)

# Farben für PowerShell
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }

Write-Info "🎣 GitHub Webhook Setup für Windows Entwicklung"
Write-Host ""

# Get current directory
$AppDir = Get-Location

# Generate webhook secret if not provided
if (-not $WebhookSecret) {
    Write-Info "🔐 Generiere Webhook Secret..."
    $WebhookSecret = -join ((1..64) | ForEach-Object { "{0:X}" -f (Get-Random -Max 16) })
    Write-Success "Webhook Secret generiert"
}

# Create or update .env file
Write-Info "📝 Konfiguriere .env Datei..."

$envContent = @"

# GitHub Webhook Configuration (Development)
WEBHOOK_PORT=$Port
WEBHOOK_SECRET=$WebhookSecret
APP_DIR=$AppDir
NODE_ENV=development
"@

if (Test-Path ".env") {
    Write-Warning ".env Datei existiert bereits"
    # Remove old webhook settings
    $content = Get-Content ".env" | Where-Object { $_ -notmatch "WEBHOOK_" }
    $content | Set-Content ".env"
}

Add-Content -Path ".env" -Value $envContent
Write-Success ".env konfiguriert"

# Check if Node.js is available
Write-Info "🔍 Prüfe Node.js Installation..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js gefunden: $nodeVersion"
} catch {
    Write-Error "Node.js nicht gefunden! Bitte installieren: https://nodejs.org"
    exit 1
}

# Install dependencies if needed
Write-Info "📦 Prüfe Dependencies..."
if (-not (Test-Path "node_modules")) {
    Write-Info "Installiere Dependencies..."
    npm install
    Write-Success "Dependencies installiert"
} else {
    Write-Success "Dependencies bereits installiert"
}

# Check if PM2 is available (optional)
Write-Info "🔍 Prüfe PM2 Installation..."
try {
    $pm2Version = pm2 --version 2>$null
    $pm2Available = $true
    Write-Success "PM2 gefunden: $pm2Version"
} catch {
    $pm2Available = $false
    Write-Warning "PM2 nicht installiert (optional für lokale Entwicklung)"
    Write-Info "Installation: npm install -g pm2"
}

# Get local IP for webhook URL (for local testing)
Write-Info "🌐 Ermittle lokale IP..."
$localIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" })[0].IPAddress

if (-not $localIP) {
    $localIP = "localhost"
}

$webhookUrlLocal = "http://${localIP}:${Port}/webhook"
$webhookUrlProduction = "http://18.206.241.165:3001/webhook"

# Show configuration
Write-Host ""
Write-Host "==================================================" -ForegroundColor Blue
Write-Success "🎉 Windows Webhook Setup abgeschlossen!"
Write-Host "==================================================" -ForegroundColor Blue
Write-Host ""

Write-Info "🔧 Lokale Konfiguration:"
Write-Host "   Lokale Webhook URL: $webhookUrlLocal"
Write-Host "   Produktions Webhook URL: $webhookUrlProduction"
Write-Host "   Webhook Secret: $WebhookSecret"
Write-Host "   Port: $Port"
Write-Host "   App Directory: $AppDir"
Write-Host ""

Write-Info "🚀 Webhook Service starten:"
Write-Host ""
Write-Host "   Option 1 - Node.js direkt:" -ForegroundColor Yellow
Write-Host "   node webhook-listener.js"
Write-Host ""

if ($pm2Available) {
    Write-Host "   Option 2 - Mit PM2:" -ForegroundColor Yellow
    Write-Host "   pm2 start webhook-listener.js --name webhook-dev"
    Write-Host ""
}

Write-Host "   Option 3 - PowerShell:" -ForegroundColor Yellow
Write-Host "   Start-Process node -ArgumentList 'webhook-listener.js' -NoNewWindow"
Write-Host ""

Write-Info "📋 GitHub Repository Setup:"
Write-Host "   Für lokale Tests:" -ForegroundColor Yellow
Write-Host "   1. GitHub.com → Repository → Settings → Webhooks"
Write-Host "   2. Add webhook"
Write-Host "   3. Payload URL: $webhookUrlLocal"
Write-Host "   4. Content type: application/json"
Write-Host "   5. Secret: $WebhookSecret"
Write-Host "   6. Events: Just the push event"
Write-Host ""
Write-Host "   Für Produktion:" -ForegroundColor Green
Write-Host "   3. Payload URL: $webhookUrlProduction"
Write-Host ""

Write-Info "🧪 Lokale Tests:"
Write-Host "   # Health Check"
Write-Host "   Invoke-RestMethod -Uri 'http://localhost:$Port/webhook/health'"
Write-Host ""
Write-Host "   # Manual Deploy Test"
Write-Host "   Invoke-RestMethod -Uri 'http://localhost:$Port/webhook/deploy' -Method Post -ContentType 'application/json' -Body '{}'"
Write-Host ""

Write-Info "🔄 Entwicklungsworkflow:"
Write-Host "   1. Änderungen in main branch machen"
Write-Host "   2. git checkout live"
Write-Host "   3. git merge main"
Write-Host "   4. git push origin live"
Write-Host "   → Lokaler Webhook wird getriggert (wenn läuft)"
Write-Host ""

Write-Warning "⚠️  Hinweise für Entwicklung:"
Write-Host "   • Dies ist nur für lokale Tests!"
Write-Host "   • Produktionsserver nutzt Linux Scripts"
Write-Host "   • Port $Port muss für GitHub erreichbar sein (ngrok/Firewall)"
Write-Host "   • Webhook reagiert nur auf 'live' branch"
Write-Host ""

Write-Success "🎯 Nächste Schritte:"
Write-Host "   1. Webhook Service starten (siehe oben)"
Write-Host "   2. Optional: GitHub Webhook für lokale Tests konfigurieren"
Write-Host "   3. Für Produktion: Linux Server Scripts verwenden"
