#!/bin/bash

# =============================================================================
# Warten is ORG - Security Check Script
# =============================================================================
# Prüft auf potentielle Sicherheitsprobleme vor Git Commits
# Läuft automatisch vom Projekt-Root
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

ISSUES_FOUND=0

# Wechsle zum Projekt-Root (zwei Ebenen nach oben von scripts/security/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

print_info "Security Check für: $PROJECT_ROOT"

# Check for .env files
check_env_files() {
    print_info "Prüfe .env Dateien..."
    
    if find . -name ".env*" -not -name ".env.example" -not -path "./node_modules/*" | grep -q .; then
        print_error "Gefundene .env Dateien:"
        find . -name ".env*" -not -name ".env.example" -not -path "./node_modules/*" | while read file; do
            echo "  - $file"
        done
        print_warning "Diese Dateien sollten nicht committet werden!"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        print_success "Keine .env Dateien gefunden"
    fi
}

# Check for potential secrets in staged files
check_staged_secrets() {
    print_info "Prüfe auf potentielle Secrets in staged Dateien..."
    
    if git diff --cached --name-only 2>/dev/null | head -1 > /dev/null; then
        # Git repository with staged changes
        SECRETS_PATTERN="(password|secret|key|token|api_key|apikey|auth|credential|private).*[=:]\s*['\"][^'\"]{8,}['\"]"
        
        if git diff --cached | grep -qiE "$SECRETS_PATTERN"; then
            print_error "Potentielle Secrets in staged Änderungen gefunden!"
            git diff --cached | grep -iE "$SECRETS_PATTERN" | head -5
            print_warning "Bitte überprüfen Sie diese Zeilen vor dem Commit!"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        else
            print_success "Keine Secrets in staged Änderungen"
        fi
    else
        print_info "Keine staged Änderungen gefunden"
    fi
}

# Check for large files
check_large_files() {
    print_info "Prüfe auf große Dateien..."
    
    LARGE_FILES=$(find . -type f -size +10M -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)
    
    if [[ -n "$LARGE_FILES" ]]; then
        print_warning "Große Dateien gefunden (>10MB):"
        echo "$LARGE_FILES" | while read file; do
            SIZE=$(du -h "$file" | cut -f1)
            echo "  - $file ($SIZE)"
        done
        print_info "Überprüfen Sie ob diese Dateien wirklich committet werden sollen"
    else
        print_success "Keine großen Dateien gefunden"
    fi
}

# Check for sensitive file patterns
check_sensitive_files() {
    print_info "Prüfe auf sensible Dateien..."
    
    SENSITIVE_PATTERNS=(
        "*.key"
        "*.pem" 
        "*.crt"
        "*.p12"
        "*.jks"
        "backup.sql"
        "dump.sql"
        "credentials.json"
        "auth.json"
        "service-account.json"
    )
    
    FOUND_FILES=""
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        FILES=$(find . -name "$pattern" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)
        if [[ -n "$FILES" ]]; then
            FOUND_FILES="$FOUND_FILES\n$FILES"
        fi
    done
    
    if [[ -n "$FOUND_FILES" ]]; then
        print_warning "Sensible Dateien gefunden:"
        echo -e "$FOUND_FILES" | grep -v "^$" | while read file; do
            echo "  - $file"
        done
        print_info "Stellen Sie sicher, dass diese in .gitignore stehen"
    else
        print_success "Keine sensiblen Dateien gefunden"
    fi
}

# Check .gitignore completeness
check_gitignore() {
    print_info "Prüfe .gitignore Vollständigkeit..."
    
    if [[ ! -f .gitignore ]]; then
        print_error ".gitignore Datei fehlt!"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        return
    fi
    
    REQUIRED_PATTERNS=(
        ".env"
        "node_modules/"
        "*.log"
        "secrets/"
        "*.key"
    )
    
    MISSING_PATTERNS=""
    for pattern in "${REQUIRED_PATTERNS[@]}"; do
        if ! grep -q "$pattern" .gitignore; then
            MISSING_PATTERNS="$MISSING_PATTERNS\n  - $pattern"
        fi
    done
    
    if [[ -n "$MISSING_PATTERNS" ]]; then
        print_warning "Fehlende .gitignore Patterns:"
        echo -e "$MISSING_PATTERNS"
        print_info "Überprüfen Sie ob diese Patterns hinzugefügt werden sollten"
    else
        print_success ".gitignore enthält wichtige Patterns"
    fi
}

# Check for hardcoded URLs
check_hardcoded_urls() {
    print_info "Prüfe auf hardcoded URLs/IPs..."
    
    URL_PATTERN="https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    IP_PATTERN="[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"
    
    FOUND_URLS=$(find . -name "*.js" -not -path "./node_modules/*" -exec grep -l "$URL_PATTERN\|$IP_PATTERN" {} \; 2>/dev/null || true)
    
    if [[ -n "$FOUND_URLS" ]]; then
        print_warning "Dateien mit URLs/IPs gefunden:"
        echo "$FOUND_URLS" | while read file; do
            echo "  - $file"
        done
        print_info "Prüfen Sie ob diese URLs/IPs konfigurierbar sein sollten"
    else
        print_success "Keine hardcoded URLs/IPs gefunden"
    fi
}

# Main function
main() {
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE} 🔒 Warten is ORG - Security Check ${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
    
    check_env_files
    echo ""
    check_staged_secrets
    echo ""
    check_large_files
    echo ""
    check_sensitive_files
    echo ""
    check_gitignore
    echo ""
    check_hardcoded_urls
    echo ""
    
    echo -e "${BLUE}================================================================${NC}"
    
    if [[ $ISSUES_FOUND -eq 0 ]]; then
        print_success "🎉 Keine kritischen Sicherheitsprobleme gefunden!"
        echo ""
        echo -e "${GREEN}✅ Sicher zu committen${NC}"
    else
        print_error "⚠️  $ISSUES_FOUND kritische Problem(e) gefunden!"
        echo ""
        echo -e "${RED}❌ Bitte Probleme beheben vor Commit${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}================================================================${NC}"
}

# Run check
main "$@"
