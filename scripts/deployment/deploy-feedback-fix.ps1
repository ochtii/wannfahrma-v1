# Feedback API Fix Deployment Script (Windows)
# This script fixes the feedback API configuration and deploys it

Write-Host "🚀 Deploying Feedback API Fix..." -ForegroundColor Green

# Check if we're in the correct directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Not in project root directory" -ForegroundColor Red
    exit 1
}

# Install feedback dependencies
Write-Host "📦 Installing feedback dependencies..." -ForegroundColor Yellow
Set-Location feedback
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install feedback dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
Write-Host "📝 Next steps for server deployment:" -ForegroundColor Cyan
Write-Host "1. Commit and push changes to GitHub" -ForegroundColor White
Write-Host "2. SSH to server: ssh ubuntu@wartenis.org" -ForegroundColor White
Write-Host "3. Run: cd wannfahrma-v1 && git pull" -ForegroundColor White
Write-Host "4. Run: bash scripts/deployment/deploy-feedback-fix.sh" -ForegroundColor White
