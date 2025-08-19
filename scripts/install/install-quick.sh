#!/bin/bash

# =============================================================================
# wann fahrma OIDA - Ubuntu Quick Install (Fixed)
# =============================================================================
# Vereinfachte Version mit Fehlerbehebungen
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

# Quick system setup
setup_system() {
    print_info "System Setup..."
    
    sudo apt update
    sudo apt install -y curl wget git build-essential python3 python3-pip
    
    # Fix pip3 issue
    if ! command -v pip3 &> /dev/null; then
        print_info "Erstelle pip3 symlink..."
        sudo ln -sf $(which pip || which pip3) /usr/local/bin/pip3 2>/dev/null || true
    fi
    
    print_success "System bereit"
}

# Install Node.js (simplified)
install_node() {
    print_info "Node.js Installation..."
    
    if command -v node &> /dev/null; then
        print_info "Node.js bereits installiert: $(node -v)"
    else
        # Use NodeSource script
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js $(node -v) installiert"
    fi
}

# Install Python packages
install_python_packages() {
    print_info "Python Pakete..."
    
    # Check for externally-managed-environment (Ubuntu 24.04+)
    if python3 -c "import sys; exit(0 if sys.version_info >= (3,11) else 1)" 2>/dev/null && \
       test -f /usr/lib/python*/EXTERNALLY-MANAGED 2>/dev/null; then
        print_warning "Externally-managed Python environment erkannt"
        print_info "Verwende apt-Pakete..."
        sudo apt install -y python3-pandas python3-openpyxl python3-requests python3-venv 2>/dev/null || {
            print_warning "Apt-Pakete nicht verfügbar, überspringe Python-Pakete"
        }
    else
        # Try different pip commands for older systems
        if command -v pip3 &> /dev/null; then
            pip3 install --user pandas openpyxl requests 2>/dev/null || print_warning "pip3 fehlgeschlagen"
        elif command -v pip &> /dev/null; then
            pip install --user pandas openpyxl requests 2>/dev/null || print_warning "pip fehlgeschlagen"
        else
            python3 -m pip install --user pandas openpyxl requests 2>/dev/null || print_warning "python3 -m pip fehlgeschlagen"
        fi
    fi
    
    print_success "Python Setup abgeschlossen"
}

# Install PM2
install_pm2() {
    print_info "PM2 Installation..."
    
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
        print_success "PM2 installiert"
    else
        print_info "PM2 bereits installiert"
    fi
}

# Setup application
setup_app() {
    print_info "Anwendung Setup..."
    
    APP_DIR="$HOME/wannfahrma-v1"
    
    if [[ ! -d "$APP_DIR" ]]; then
        git clone https://github.com/ochtii/wannfahrma-v1.git "$APP_DIR"
    fi
    
    cd "$APP_DIR"
    npm install
    
    # Create simple .env
    if [[ ! -f .env ]]; then
        cat > .env <<EOF
PORT=3000
NODE_ENV=production
API_BASE_URL=https://www.wienerlinien.at/ogd_realtime
API_TIMEOUT=10000
EOF
    fi
    
    # Create logs directory
    mkdir -p logs
    
    print_success "Anwendung bereit"
}

# Start with PM2
start_app() {
    print_info "Anwendung starten..."
    
    cd "$HOME/wannfahrma-v1"
    
    # Simple PM2 start
    pm2 start server.js --name wannfahrma
    pm2 save
    pm2 startup | tail -1 | sudo bash || true
    
    print_success "Anwendung gestartet"
}

# Create management scripts
create_scripts() {
    cd "$HOME/wannfahrma-v1"
    
    # Simple start script
    cat > start.sh <<'EOF'
#!/bin/bash
pm2 start wannfahrma || pm2 restart wannfahrma
echo "✅ App gestartet: http://localhost:3000"
EOF
    
    # Simple stop script  
    cat > stop.sh <<'EOF'
#!/bin/bash
pm2 stop wannfahrma
echo "⏹️ App gestoppt"
EOF
    
    chmod +x start.sh stop.sh
    print_success "Management Scripts erstellt"
}

# Test installation
test_app() {
    print_info "Test der Installation..."
    sleep 3
    
    if curl -f -s http://localhost:3000/health > /dev/null; then
        print_success "🎉 Installation erfolgreich!"
        echo ""
        echo -e "${BLUE}📍 Zugriff: http://localhost:3000${NC}"
        echo -e "${BLUE}🛠️ Management: ./start.sh | ./stop.sh${NC}"
        echo -e "${BLUE}📊 Logs: pm2 logs wannfahrma${NC}"
    else
        print_error "App antwortet nicht. Prüfe: pm2 logs wannfahrma"
        exit 1
    fi
}

# Main function
main() {
    echo -e "${BLUE}🚇 wann fahrma OIDA - Quick Install${NC}"
    echo ""
    
    setup_system
    install_node
    install_python_packages
    install_pm2
    setup_app
    start_app
    create_scripts
    test_app
    
    echo ""
    print_success "🚇 Installation abgeschlossen!"
}

# Check if not root
if [[ $EUID -eq 0 ]]; then
    print_error "Nicht als root ausführen!"
    exit 1
fi

main "$@"
