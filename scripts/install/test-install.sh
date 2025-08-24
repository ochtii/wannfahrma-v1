#!/bin/bash

# =============================================================================
# Warten is ORG - Test Script
# =============================================================================
# Testet das Installationsskript in einem Docker Container oder VM
# =============================================================================

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
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

# Test system requirements
test_requirements() {
    print_info "Teste System-Anforderungen..."
    
    # Test OS
    if grep -q "Ubuntu" /etc/os-release; then
        print_success "Ubuntu erkannt"
    else
        print_warning "Nicht Ubuntu - Test fortsetzen"
    fi
    
    # Test commands
    REQUIRED_COMMANDS="curl wget git sudo"
    for cmd in $REQUIRED_COMMANDS; do
        if command -v $cmd &> /dev/null; then
            print_success "$cmd verfügbar"
        else
            print_error "$cmd nicht gefunden!"
        fi
    done
    
    # Test package manager
    if command -v apt &> /dev/null; then
        print_success "apt verfügbar"
    else
        print_error "apt nicht gefunden!"
    fi
    
    # Test user permissions
    if [[ $EUID -eq 0 ]]; then
        print_warning "Läuft als root - Das könnte Probleme verursachen"
    else
        print_success "Läuft als normaler Benutzer"
    fi
    
    # Test sudo
    if sudo -n true 2>/dev/null; then
        print_success "sudo ohne Passwort verfügbar"
    else
        print_info "sudo benötigt Passwort - das ist normal"
    fi
}

# Test Python installation
test_python() {
    print_info "Teste Python Installation..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_success "Python3: $PYTHON_VERSION"
    else
        print_error "Python3 nicht gefunden"
    fi
    
    # Test pip variants
    if command -v pip3 &> /dev/null; then
        print_success "pip3 verfügbar"
    elif command -v pip &> /dev/null; then
        print_warning "pip verfügbar (aber nicht pip3)"
    elif python3 -m pip --version &> /dev/null; then
        print_success "python3 -m pip verfügbar"
    else
        print_error "Kein pip gefunden"
    fi
}

# Test Node.js installation
test_nodejs() {
    print_info "Teste Node.js Installation..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js: $NODE_VERSION"
        
        MAJOR_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
        if [[ $MAJOR_VERSION -ge 16 ]]; then
            print_success "Node.js Version ist ausreichend (>=16)"
        else
            print_warning "Node.js Version könnte zu alt sein (<16)"
        fi
    else
        print_info "Node.js nicht installiert - wird vom Script installiert"
    fi
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "npm: $NPM_VERSION"
    else
        print_info "npm nicht installiert - wird mit Node.js installiert"
    fi
}

# Test PM2
test_pm2() {
    print_info "Teste PM2 Installation..."
    
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 -v)
        print_success "PM2: $PM2_VERSION"
    else
        print_info "PM2 nicht installiert - wird vom Script installiert"
    fi
}

# Test network connectivity
test_network() {
    print_info "Teste Netzwerk-Verbindung..."
    
    # Test DNS
    if nslookup google.com &> /dev/null; then
        print_success "DNS funktioniert"
    else
        print_error "DNS Problem"
    fi
    
    # Test HTTPS
    if curl -s --max-time 10 https://google.com &> /dev/null; then
        print_success "HTTPS Verbindung funktioniert"
    else
        print_error "HTTPS Problem"
    fi
    
    # Test Node.js repo
    if curl -s --max-time 10 https://deb.nodesource.com &> /dev/null; then
        print_success "Node.js Repository erreichbar"
    else
        print_warning "Node.js Repository nicht erreichbar"
    fi
}

# Test disk space
test_disk_space() {
    print_info "Teste verfügbaren Speicherplatz..."
    
    AVAILABLE=$(df -h . | awk 'NR==2 {print $4}' | sed 's/[^0-9.]//g')
    if [[ -n "$AVAILABLE" ]]; then
        print_info "Verfügbarer Speicher: $(df -h . | awk 'NR==2 {print $4}')"
        
        # Check if at least 1GB available (rough estimate)
        if [[ $(echo "$AVAILABLE > 1" | bc -l 2>/dev/null || echo "1") == "1" ]]; then
            print_success "Ausreichend Speicherplatz verfügbar"
        else
            print_warning "Möglicherweise wenig Speicherplatz"
        fi
    else
        print_warning "Kann Speicherplatz nicht ermitteln"
    fi
}

# Main test function
main() {
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE} Warten is ORG - Installation Test ${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
    
    test_requirements
    echo ""
    test_python
    echo ""
    test_nodejs
    echo ""
    test_pm2
    echo ""
    test_network
    echo ""
    test_disk_space
    echo ""
    
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${GREEN}🎯 Test abgeschlossen!${NC}"
    echo ""
    echo -e "${BLUE}💡 Nächste Schritte:${NC}"
    echo "   1. ./install-ubuntu.sh ausführen"
    echo "   2. Bei Problemen siehe INSTALL-UBUNTU.md"
    echo ""
    echo -e "${YELLOW}⚠️  Bei Fehlern:${NC}"
    echo "   - sudo apt update && sudo apt install -y curl wget git"
    echo "   - Internet-Verbindung prüfen"
    echo "   - Als normaler Benutzer (nicht root) ausführen"
    echo -e "${BLUE}================================================================${NC}"
}

# Run main function
main "$@"
