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
    print_info "Installiere Python Pakete..."
    if command -v pip3 &> /dev/null; then
        pip3 install --user pandas openpyxl requests
    elif command -v pip &> /dev/null; then
        pip install --user pandas openpyxl requests
    else
        python3 -m pip install --user pandas openpyxl requests
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
    read -p "Domain: " DOMAIN
    
    if [[ -n "$EMAIL" && -n "$DOMAIN" ]]; then
        print_info "Erstelle SSL Zertifikat für $DOMAIN..."
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL
        
        print_success "SSL Zertifikat installiert"
        print_info "Automatische Erneuerung wird eingerichtet..."
        sudo systemctl enable certbot.timer
    fi
}

# Clone and setup application
setup_application() {
    print_header "Application Setup"
    
    APP_DIR="$HOME/wannfahrma-v1"
    
    if [[ -d "$APP_DIR" ]]; then
        print_warning "Verzeichnis $APP_DIR existiert bereits!"
        read -p "Überschreiben? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$APP_DIR"
        else
            print_info "Installation in bestehendes Verzeichnis..."
        fi
    fi
    
    if [[ ! -d "$APP_DIR" ]]; then
        print_info "Clone Repository..."
        git clone https://github.com/ochtii/wannfahrma-v1.git "$APP_DIR"
    fi
    
    cd "$APP_DIR"
    
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
    cat > ecosystem.config.js <<EOF
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
pm2 start ecosystem.config.js
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
