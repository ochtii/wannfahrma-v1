#!/bin/bash

# =============================================================================
# wann fahrma OIDA - Deployment Script
# =============================================================================
# Für Updates auf dem Production Server
# =============================================================================

set -e

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="$HOME/wannfahrma-v1"
BACKUP_DIR="$HOME/backups/wannfahrma-$(date +%Y%m%d_%H%M%S)"

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

# Check if app directory exists
if [[ ! -d "$APP_DIR" ]]; then
    print_error "Application directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

print_info "🚀 Starting deployment..."

# Create backup
print_info "📦 Creating backup..."
mkdir -p "$(dirname "$BACKUP_DIR")"
cp -r "$APP_DIR" "$BACKUP_DIR"
print_success "Backup created: $BACKUP_DIR"

# Stop application
print_info "⏹️  Stopping application..."
pm2 stop wannfahrma || true

# Pull latest changes
print_info "📥 Pulling latest changes..."
git fetch origin
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [[ "$LOCAL_COMMIT" == "$REMOTE_COMMIT" ]]; then
    print_warning "No updates available"
    pm2 start scripts/deployment/ecosystem.config.js
    exit 0
fi

print_info "Updates available: $LOCAL_COMMIT -> $REMOTE_COMMIT"
git pull origin main

# Install/update dependencies
print_info "📦 Installing dependencies..."
npm ci --production

# Run any database migrations or setup
print_info "🔧 Running setup tasks..."
# Add any migration scripts here if needed

# Restart application
print_info "🔄 Restarting application..."
pm2 start scripts/deployment/ecosystem.config.js

# Wait for app to be ready
print_info "⏳ Waiting for application to start..."
sleep 5

# Health check
print_info "🏥 Running health check..."
if curl -f -s http://localhost:3000/health > /dev/null; then
    print_success "Deployment successful! ✨"
    print_info "Application is running at http://localhost:3000"
    
    # Cleanup old backups (keep last 5)
    print_info "🧹 Cleaning up old backups..."
    ls -t "$HOME/backups/" | grep "wannfahrma-" | tail -n +6 | xargs -r rm -rf
    
else
    print_error "Health check failed!"
    print_warning "Rolling back to previous version..."
    
    # Rollback
    pm2 stop wannfahrma
    rm -rf "$APP_DIR"
    mv "$BACKUP_DIR" "$APP_DIR"
    cd "$APP_DIR"
    pm2 start scripts/deployment/ecosystem.config.js
    
    print_error "Rollback completed. Please check the logs."
    exit 1
fi

print_success "🎉 Deployment completed successfully!"
