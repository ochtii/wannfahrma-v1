#!/bin/bash

# Feedback API Fix Deployment Script
# This script fixes the feedback API configuration and deploys it

echo "🚀 Deploying Feedback API Fix..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Stop PM2 processes
echo "⏹️  Stopping PM2 processes..."
pm2 stop all || true

# Install feedback dependencies
echo "📦 Installing feedback dependencies..."
cd feedback
npm install || {
    echo "❌ Failed to install feedback dependencies"
    exit 1
}
cd ..

# Restart with updated configuration
echo "🔄 Starting PM2 with updated ecosystem..."
if [ -f "webhook-listener.js" ]; then
    # Use webhook version if webhook listener exists
    pm2 start scripts/deployment/ecosystem-with-webhook.config.js --env production
else
    # Use standard version
    pm2 start scripts/deployment/ecosystem.config.js --env production
fi

# Check PM2 status
echo "📊 PM2 Status:"
pm2 list

# Check if feedback API is responding
echo "🔍 Testing Feedback API..."
sleep 5
curl -f http://localhost:3002/api/feedback/stats || {
    echo "⚠️  Feedback API not responding yet, checking logs..."
    pm2 logs wannfahrma-feedback --lines 10
}

echo "✅ Deployment completed!"
echo "📝 Feedback System: http://$(hostname -I | awk '{print $1}'):3002/feedback"
echo "📊 Main App: http://$(hostname -I | awk '{print $1}'):3000"

# Show process status
pm2 status
