#!/bin/bash

# =============================================================================
# wann fahrma OIDA - Ubuntu Server Installation Script
# =============================================================================
# Dieses Skript installiert die Anwendung auf einem Ubuntu Server
# Für Ubuntu 20.04 LTS oder neuer
# =============================================================================

set -e  # Exit on any error

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Dieses Skript sollte NICHT als root ausgeführt werden!"
        print_info "Führen Sie es als normaler Benutzer aus. sudo wird automatisch verwendet wenn nötig."
        exit 1
    fi
}

# Check Ubuntu version
check_ubuntu_version() {
    if ! grep -q "Ubuntu" /etc/os-release; then
        print_error "Dieses Skript ist für Ubuntu optimiert!"
        print_warning "Fortfahren auf eigene Gefahr..."
        read -p "Trotzdem fortfahren? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    if command -v lsb_release &> /dev/null; then
        VERSION=$(lsb_release -rs)
        print_info "Ubuntu Version: $VERSION"
        
        # Simple version comparison without bc
        MAJOR_VERSION=$(echo "$VERSION" | cut -d'.' -f1)
        MINOR_VERSION=$(echo "$VERSION" | cut -d'.' -f2)
        
        if [[ $MAJOR_VERSION -lt 20 ]] || [[ $MAJOR_VERSION -eq 20 && $MINOR_VERSION -lt 4 ]]; then
            print_warning "Ubuntu 20.04 oder neuer wird empfohlen!"
        fi
    else
        print_warning "Kann Ubuntu Version nicht ermitteln. Fortfahren..."
    fi
}

# Update system
update_system() {
    print_header "System Update"
    
    print_info "Aktualisiere Paketlisten..."
    sudo apt update
    
    print_info "Aktualisiere System..."
    sudo apt upgrade -y
    
    print_info "Installiere grundlegende Tools..."
    sudo apt install -y curl wget git unzip build-essential software-properties-common lsb-release
    
    # Install additional tools that might be needed
    sudo apt install -y ca-certificates gnupg apt-transport-https
    
    print_success "System erfolgreich aktualisiert"
}

# Install Node.js
install_nodejs() {
    print_header "Node.js Installation"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_info "Node.js bereits installiert: $NODE_VERSION"
        
        # Check if version is recent enough (v16+)
        MAJOR_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
        if [[ $MAJOR_VERSION -lt 16 ]]; then
            print_warning "Node.js Version zu alt. Installiere aktuelle Version..."
        else
            print_success "Node.js Version ist aktuell"
            return 0
        fi
    fi
    
    print_info "Installiere Node.js (LTS)..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    print_success "Node.js $NODE_VERSION installiert"
    print_success "npm $NPM_VERSION installiert"
}

# Install Python (for data processing)
install_python() {
    print_header "Python Installation"
    
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_info "Python bereits installiert: $PYTHON_VERSION"
    else
        print_info "Installiere Python3..."
        sudo apt install -y python3 python3-pip python3-venv
    fi
    
    # Ensure pip is available
    if ! command -v pip3 &> /dev/null; then
        if ! command -v pip &> /dev/null; then
            print_info "Installiere pip..."
            sudo apt install -y python3-pip
            # Try to create pip3 symlink if it doesn't exist
            if command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
                sudo ln -sf $(which pip) /usr/local/bin/pip3 2>/dev/null || true
            fi
        fi
    fi
    
    # Use python3 -m pip as fallback
    print_info "Python-Pakete für Datenverarbeitung (optional)..."
    
    # Check if data processing is needed
    if [[ -f "process_data.py" ]]; then
        print_info "process_data.py gefunden - installiere Datenverarbeitungs-Pakete..."
        
        # Check for externally-managed-environment (Ubuntu 24.04+/Debian 12+)
        EXTERNALLY_MANAGED=false
        
        # Check multiple indicators for externally-managed environment
        if test -f /usr/lib/python*/EXTERNALLY-MANAGED 2>/dev/null || \
           test -f /usr/lib/python3*/EXTERNALLY-MANAGED 2>/dev/null || \
           python3 -m pip install --help 2>&1 | grep -q "externally-managed" || \
           (python3 -c "import sys; exit(0 if sys.version_info >= (3,11) else 1)" 2>/dev/null && \
            lsb_release -r 2>/dev/null | grep -E "(24\.|12\.)" >/dev/null); then
            EXTERNALLY_MANAGED=true
        fi
        
        if [ "$EXTERNALLY_MANAGED" = true ]; then
            print_warning "Python environment ist 'externally-managed' (Ubuntu 24.04+/Debian 12+)"
            print_info "Verwende system-packages für Python-Pakete..."
            
            # Install Python packages via apt (safer for system Python)
            print_info "Installiere Python-Pakete über apt..."
            sudo apt update
            sudo apt install -y python3-pandas python3-openpyxl python3-requests python3-venv python3-dev
            
            # Install pipx for Python applications
            print_info "Installiere pipx für isolated Python-Apps..."
            sudo apt install -y pipx || {
                print_warning "pipx nicht verfügbar über apt, installiere über pip..."
                sudo apt install -y python3-pip
                python3 -m pip install --user pipx --break-system-packages 2>/dev/null || true
            }
            
            print_success "Python-Pakete über apt installiert (externally-managed environment)"
        else
            # Traditional pip installation for older systems
            print_info "Verwende pip für Paket-Installation (legacy system)..."
            if command -v pip3 &> /dev/null; then
                pip3 install --user pandas openpyxl requests
            elif command -v pip &> /dev/null; then
                pip install --user pandas openpyxl requests
            else
                python3 -m pip install --user pandas openpyxl requests
            fi
            print_success "Python-Pakete über pip installiert"
        fi
    else
        print_info "process_data.py nicht gefunden - überspringe Python-Pakete"
        print_info "App funktioniert auch ohne Datenverarbeitung"
        print_success "Python-Installation übersprungen (nicht benötigt)"
    fi
    
    print_success "Python erfolgreich installiert"
}

# Install PM2 for process management
install_pm2() {
    print_header "PM2 Process Manager Installation"
    
    if command -v pm2 &> /dev/null; then
        print_info "PM2 bereits installiert"
    else
        print_info "Installiere PM2..."
        sudo npm install -g pm2
    fi
    
    # Setup PM2 startup
    print_info "Konfiguriere PM2 Autostart..."
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    
    print_success "PM2 erfolgreich installiert"
}

# Install and configure Nginx
install_nginx() {
    print_header "Nginx Installation"
    
    read -p "Nginx als Reverse Proxy installieren? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Nginx Installation übersprungen"
        return 0
    fi
    
    print_info "Installiere Nginx..."
    sudo apt install -y nginx
    
    # Enable and start Nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    print_success "Nginx installiert und gestartet"
    
    # Configure basic reverse proxy
    read -p "Domain/Server-Name (z.B. wannfahrma.example.com): " SERVER_NAME
    if [[ -n "$SERVER_NAME" ]]; then
        print_info "Erstelle Nginx Konfiguration für $SERVER_NAME..."
        
        sudo tee /etc/nginx/sites-available/wannfahrma > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;
    
    location / {
        proxy_pass http://localhost:3000;
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
        
        # Enable site
        sudo ln -sf /etc/nginx/sites-available/wannfahrma /etc/nginx/sites-enabled/
        sudo nginx -t
        sudo systemctl reload nginx
        
        print_success "Nginx Konfiguration erstellt"
        print_info "Für SSL/HTTPS verwenden Sie: sudo certbot --nginx -d $SERVER_NAME"
    fi
}

# Install SSL certificate (Let's Encrypt)
install_ssl() {
    print_header "SSL Zertifikat (Let's Encrypt)"
    
    if [[ ! -f /etc/nginx/sites-enabled/wannfahrma ]]; then
        print_warning "Nginx Konfiguration nicht gefunden. SSL-Installation übersprungen."
        return 0
    fi
    
    read -p "Let's Encrypt SSL Zertifikat installieren? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "SSL Installation übersprungen"
        return 0
    fi
    
    print_info "Installiere Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
    
    read -p "E-Mail für Let's Encrypt: " EMAIL
    read -p "Domain (z.B. example.com): " DOMAIN
    
    if [[ -z "$EMAIL" || -z "$DOMAIN" ]]; then
        print_error "E-Mail und Domain sind erforderlich!"
        return 1
    fi
    
    # DNS-Validierung
    print_info "Prüfe DNS-Konfiguration für $DOMAIN..."
    
    # Get server's public IP
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
    print_info "Server IP: $SERVER_IP"
    
    # Check DNS A record
    DNS_IP=$(dig +short A $DOMAIN 2>/dev/null | tail -n1)
    
    if [[ -z "$DNS_IP" ]]; then
        print_error "❌ DNS Problem: Keine A-Record für $DOMAIN gefunden!"
        print_warning "Lösung:"
        echo "  1. DNS A-Record erstellen: $DOMAIN → $SERVER_IP"
        echo "  2. Warten bis DNS propagiert ist (kann bis zu 24h dauern)"
        echo "  3. SSL später manuell installieren: sudo certbot --nginx -d $DOMAIN"
        echo ""
        read -p "Trotzdem fortfahren? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "SSL Installation abgebrochen"
            print_info "DNS erst konfigurieren, dann erneut ausführen"
            return 0
        fi
    else
        print_success "✅ DNS A-Record gefunden: $DOMAIN → $DNS_IP"
        
        if [[ "$DNS_IP" != "$SERVER_IP" ]]; then
            print_warning "⚠️  DNS zeigt auf andere IP: $DNS_IP (erwartet: $SERVER_IP)"
            print_info "Das könnte zu Problemen führen..."
            read -p "Fortfahren? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "SSL Installation abgebrochen"
                return 0
            fi
        fi
    fi
    
    # Check if domain is reachable
    print_info "Teste HTTP-Erreichbarkeit von $DOMAIN..."
    if curl -s --connect-timeout 10 -I "http://$DOMAIN" >/dev/null 2>&1; then
        print_success "✅ Domain ist über HTTP erreichbar"
    else
        print_warning "⚠️  Domain nicht über HTTP erreichbar"
        print_info "Das könnte normale sein wenn Nginx gerade konfiguriert wurde"
    fi
    
    # Attempt SSL certificate creation
    print_info "Erstelle SSL Zertifikat für $DOMAIN..."
    print_warning "Das kann ein paar Minuten dauern..."
    
    if sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL; then
        print_success "🔒 SSL Zertifikat erfolgreich installiert!"
        print_info "Automatische Erneuerung wird eingerichtet..."
        sudo systemctl enable certbot.timer
        sudo systemctl start certbot.timer
        
        print_success "✅ HTTPS ist jetzt verfügbar: https://$DOMAIN"
    else
        print_error "❌ SSL Zertifikat Installation fehlgeschlagen!"
        print_warning "Mögliche Ursachen:"
        echo "  1. DNS A-Record fehlt oder falsch konfiguriert"
        echo "  2. Domain ist nicht über Internet erreichbar"
        echo "  3. Firewall blockiert Port 80/443"
        echo "  4. Nginx läuft nicht richtig"
        echo ""
        print_info "Debugging-Schritte:"
        echo "  # DNS prüfen:"
        echo "  dig A $DOMAIN"
        echo "  nslookup $DOMAIN"
        echo ""
        echo "  # HTTP-Test:"
        echo "  curl -I http://$DOMAIN"
        echo ""
        echo "  # Nginx Status:"
        echo "  sudo systemctl status nginx"
        echo "  sudo nginx -t"
        echo ""
        echo "  # Certbot Logs:"
        echo "  sudo tail -f /var/log/letsencrypt/letsencrypt.log"
        echo ""
        echo "  # Manueller Retry:"
        echo "  sudo certbot --nginx -d $DOMAIN --dry-run"
        echo "  sudo certbot --nginx -d $DOMAIN"
        echo ""
        
        return 1
    fi
}

# Clone and setup application
setup_application() {
    print_header "Application Setup"
    
    APP_DIR="$HOME/wannfahrma-v1"
    
    # Ensure we're not in the target directory when manipulating it
    cd "$HOME"
    
    if [[ -d "$APP_DIR" ]]; then
        print_warning "Verzeichnis $APP_DIR existiert bereits!"
        
        # Check if it's a valid git repository
        if [[ -d "$APP_DIR/.git" ]]; then
            print_info "Git Repository gefunden. Versuche Update..."
            cd "$APP_DIR"
            
            # Try to update existing repository
            if git fetch origin && git reset --hard origin/master; then
                print_success "Repository erfolgreich aktualisiert"
            else
                print_warning "Git Update fehlgeschlagen. Neuinstallation nötig."
                cd "$HOME"
                read -p "Repository komplett neu clonen? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    print_info "Entferne altes Verzeichnis..."
                    rm -rf "$APP_DIR"
                else
                    print_error "Installation abgebrochen"
                    return 1
                fi
            fi
        else
            print_warning "Kein Git Repository gefunden"
            read -p "Verzeichnis überschreiben? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Entferne altes Verzeichnis..."
                rm -rf "$APP_DIR"
            else
                print_info "Installation in bestehendes Verzeichnis..."
                cd "$APP_DIR"
            fi
        fi
    fi
    
    # Clone repository if directory doesn't exist
    if [[ ! -d "$APP_DIR" ]]; then
        print_info "Clone Repository..."
        if git clone https://github.com/ochtii/wannfahrma-v1.git "$APP_DIR"; then
            print_success "Repository erfolgreich geklont"
        else
            print_error "Git Clone fehlgeschlagen!"
            print_info "Mögliche Lösungen:"
            echo "  1. Internet-Verbindung prüfen"
            echo "  2. Git installieren: sudo apt install git"
            echo "  3. Repository manuell herunterladen:"
            echo "     wget https://github.com/ochtii/wannfahrma-v1/archive/refs/heads/master.zip"
            echo "     unzip master.zip"
            echo "     mv wannfahrma-v1-master wannfahrma-v1"
            return 1
        fi
    fi
    
    # Ensure we're in the app directory
    if ! cd "$APP_DIR"; then
        print_error "Kann nicht in App-Verzeichnis wechseln: $APP_DIR"
        return 1
    fi
    
    print_info "Installiere NPM Dependencies..."
    npm install
    
    print_info "Erstelle .env Datei..."
    if [[ ! -f .env ]]; then
        cp .env.example .env 2>/dev/null || cat > .env <<EOF
# Server Configuration
PORT=3000
NODE_ENV=production

# API Configuration
API_BASE_URL=https://www.wienerlinien.at/ogd_realtime
API_TIMEOUT=10000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF
        print_success ".env Datei erstellt"
        print_warning "Bitte .env Datei nach Bedarf anpassen!"
    fi
    
    print_success "Application erfolgreich eingerichtet"
}

# Configure PM2
configure_pm2() {
    print_header "PM2 Konfiguration"
    
    cd "$HOME/wannfahrma-v1"
    
    print_info "Erstelle PM2 Konfiguration..."
    
    # Check if ecosystem.config.js already exists in new location
    if [[ ! -f scripts/deployment/ecosystem.config.js ]]; then
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
        print_success "PM2 Konfiguration erstellt unter scripts/deployment/"
    else
        print_success "PM2 Konfiguration bereits vorhanden"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    print_info "Starte Anwendung mit PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    
    print_success "PM2 erfolgreich konfiguriert"
}

# Configure firewall
configure_firewall() {
    print_header "Firewall Konfiguration"
    
    if ! command -v ufw &> /dev/null; then
        print_info "Installiere UFW Firewall..."
        sudo apt install -y ufw
    fi
    
    print_info "Konfiguriere Firewall Regeln..."
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Only allow direct access to Node.js if no Nginx
    if [[ ! -f /etc/nginx/sites-enabled/wannfahrma ]]; then
        sudo ufw allow 3000/tcp
    fi
    
    read -p "Firewall aktivieren? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ufw --force enable
        print_success "Firewall aktiviert"
    else
        print_warning "Firewall nicht aktiviert"
    fi
}

# Create service scripts
create_service_scripts() {
    print_header "Service Scripts"
    
    cd "$HOME/wannfahrma-v1"
    
    # Start script
    cat > start.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
pm2 start scripts/deployment/ecosystem.config.js
pm2 save
echo "✅ wann fahrma OIDA gestartet"
EOF
    
    # Stop script
    cat > stop.sh <<'EOF'
#!/bin/bash
pm2 stop wannfahrma
echo "⏹️  wann fahrma OIDA gestoppt"
EOF
    
    # Restart script
    cat > restart.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
pm2 restart wannfahrma
echo "🔄 wann fahrma OIDA neu gestartet"
EOF
    
    # Status script
    cat > status.sh <<'EOF'
#!/bin/bash
echo "📊 wann fahrma OIDA Status:"
pm2 status wannfahrma
echo ""
echo "📈 Logs (letzte 20 Zeilen):"
pm2 logs wannfahrma --lines 20
EOF
    
    # Update script
    cat > update.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "🔄 Update wann fahrma OIDA..."
git pull
npm install
pm2 restart wannfahrma
echo "✅ Update abgeschlossen"
EOF
    
    chmod +x start.sh stop.sh restart.sh status.sh update.sh
    
    print_success "Service Scripts erstellt"
}

# Final configuration and testing
final_setup() {
    print_header "Finale Konfiguration"
    
    cd "$HOME/wannfahrma-v1"
    
    print_info "Teste Anwendung..."
    sleep 3
    
    if curl -f -s http://localhost:3000/health > /dev/null; then
        print_success "Anwendung läuft erfolgreich!"
    else
        print_error "Anwendung antwortet nicht!"
        print_info "Prüfe Logs: pm2 logs wannfahrma"
    fi
    
    # Show access information
    print_header "Installation Abgeschlossen"
    
    echo -e "${GREEN}🎉 wann fahrma OIDA erfolgreich installiert!${NC}"
    echo ""
    echo -e "${BLUE}📍 Zugriff:${NC}"
    
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo -e "   Lokal:     http://localhost:3000"
    echo -e "   Netzwerk:  http://$LOCAL_IP:3000"
    
    if [[ -f /etc/nginx/sites-enabled/wannfahrma ]]; then
        echo -e "   Web:       http://$(grep server_name /etc/nginx/sites-enabled/wannfahrma | awk '{print $2}' | sed 's/;//')"
    fi
    
    echo ""
    echo -e "${BLUE}🛠️  Management:${NC}"
    echo -e "   Start:     ./start.sh"
    echo -e "   Stop:      ./stop.sh"
    echo -e "   Restart:   ./restart.sh"
    echo -e "   Status:    ./status.sh"
    echo -e "   Update:    ./update.sh"
    echo ""
    echo -e "${BLUE}📊 Logs:${NC}"
    echo -e "   PM2:       pm2 logs wannfahrma"
    echo -e "   Nginx:     sudo tail -f /var/log/nginx/access.log"
    echo ""
    echo -e "${YELLOW}⚠️  Wichtige Hinweise:${NC}"
    echo -e "   - .env Datei anpassen falls nötig"
    echo -e "   - Firewall konfiguriert und aktiv"
    echo -e "   - PM2 startet automatisch beim Boot"
    echo -e "   - Für SSL: sudo certbot --nginx -d domain.com"
}

# Main installation flow
main() {
    print_header "wann fahrma OIDA - Ubuntu Installation"
    
    print_info "Startet Installation auf Ubuntu Server..."
    print_info "Dieses Skript installiert Node.js, PM2, Nginx und die Anwendung"
    echo ""
    
    read -p "Installation fortsetzen? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation abgebrochen"
        exit 0
    fi
    
    check_root
    check_ubuntu_version
    update_system
    install_nodejs
    install_python
    install_pm2
    install_nginx
    install_ssl
    setup_application
    configure_pm2
    configure_firewall
    create_service_scripts
    final_setup
    
    print_success "Installation erfolgreich abgeschlossen! 🚇"
}

# Run main function
main "$@"
