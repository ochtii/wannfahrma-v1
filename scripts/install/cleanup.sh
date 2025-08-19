#!/bin/bash

# =============================================================================
# wann fahrma OIDA - Installation Cleanup Script
# =============================================================================
# Bereinigt beschädigte Installationen und bereitet Neuinstallation vor
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

print_info "🧹 wann fahrma OIDA - Installation Cleanup"
echo ""

APP_DIR="$HOME/wannfahrma-v1"

# Wechsle zu sicherem Verzeichnis
cd "$HOME"

# Check current installation
if [[ -d "$APP_DIR" ]]; then
    print_warning "Bestehende Installation gefunden: $APP_DIR"
    
    # Check if it's a valid git repository
    if [[ -d "$APP_DIR/.git" ]]; then
        print_info "Git Repository erkannt"
        
        # Try to check git status
        cd "$APP_DIR"
        if git status >/dev/null 2>&1; then
            print_success "Git Repository ist intakt"
            
            # Show current branch and status
            BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
            COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
            print_info "Branch: $BRANCH, Commit: $COMMIT"
            
            # Ask if user wants to update or remove
            echo ""
            echo "Optionen:"
            echo "  1) Git Repository aktualisieren (git pull)"
            echo "  2) Repository komplett entfernen"
            echo "  3) Belassen und Script beenden"
            echo ""
            read -p "Auswahl (1-3): " -n 1 -r CHOICE
            echo
            
            case $CHOICE in
                1)
                    print_info "Aktualisiere Repository..."
                    git fetch origin
                    git reset --hard origin/master
                    print_success "Repository aktualisiert"
                    ;;
                2)
                    cd "$HOME"
                    print_info "Entferne Repository..."
                    rm -rf "$APP_DIR"
                    print_success "Repository entfernt"
                    ;;
                3)
                    print_info "Keine Änderungen vorgenommen"
                    exit 0
                    ;;
                *)
                    print_error "Ungültige Auswahl"
                    exit 1
                    ;;
            esac
        else
            print_error "Git Repository ist beschädigt"
            cd "$HOME"
            read -p "Beschädigtes Repository entfernen? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Entferne beschädigtes Repository..."
                rm -rf "$APP_DIR"
                print_success "Beschädigtes Repository entfernt"
            fi
        fi
    else
        print_warning "Kein Git Repository (normale Dateien)"
        read -p "Verzeichnis entfernen? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Entferne Verzeichnis..."
            rm -rf "$APP_DIR"
            print_success "Verzeichnis entfernt"
        fi
    fi
else
    print_success "Keine bestehende Installation gefunden"
fi

# Clean up potential leftovers
print_info "Bereinige potentielle Überreste..."

# Remove any stuck PM2 processes
if command -v pm2 >/dev/null 2>&1; then
    pm2 delete wannfahrma 2>/dev/null || true
    pm2 save 2>/dev/null || true
    print_success "PM2 Prozesse bereinigt"
fi

# Remove any old nginx configs
if [[ -f /etc/nginx/sites-enabled/wannfahrma ]]; then
    print_warning "Nginx Konfiguration gefunden"
    read -p "Nginx Konfiguration entfernen? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo rm -f /etc/nginx/sites-enabled/wannfahrma
        sudo rm -f /etc/nginx/sites-available/wannfahrma
        sudo systemctl reload nginx
        print_success "Nginx Konfiguration entfernt"
    fi
fi

# Check for installation scripts in current directory
if [[ -f "./install-ubuntu.sh" || -f "./install-quick.sh" ]]; then
    print_warning "Installation Scripts im aktuellen Verzeichnis gefunden"
    print_info "Diese können nach dem Cleanup entfernt werden"
fi

echo ""
print_success "🎉 Cleanup abgeschlossen!"
echo ""

# Offer to download fresh copy
if [[ ! -d "$APP_DIR" ]]; then
    read -p "Frische Kopie des Repositories herunterladen? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Lade Repository herunter..."
        
        if git clone https://github.com/ochtii/wannfahrma-v1.git "$APP_DIR"; then
            print_success "Repository erfolgreich heruntergeladen"
            print_info "Bereit für Installation:"
            echo "  cd $APP_DIR"
            echo "  chmod +x scripts/install/install-ubuntu.sh"
            echo "  ./scripts/install/install-ubuntu.sh"
        else
            print_warning "Git Clone fehlgeschlagen, versuche ZIP Download..."
            wget https://github.com/ochtii/wannfahrma-v1/archive/refs/heads/master.zip -O /tmp/wannfahrma.zip
            unzip /tmp/wannfahrma.zip -d "$HOME/"
            mv "$HOME/wannfahrma-v1-master" "$APP_DIR"
            print_success "Repository via ZIP heruntergeladen"
            print_info "Bereit für Installation:"
            echo "  cd $APP_DIR"
            echo "  chmod +x scripts/install/install-ubuntu.sh"
            echo "  ./scripts/install/install-ubuntu.sh"
        fi
    fi
else
    print_info "Repository bereit für Installation:"
    echo "  cd $APP_DIR"
    echo "  chmod +x scripts/install/install-ubuntu.sh"
    echo "  ./scripts/install/install-ubuntu.sh"
fi

echo ""
print_success "Cleanup erfolgreich! ✨"
