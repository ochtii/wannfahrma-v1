const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const webhookApp = express();
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';
const TARGET_BRANCH = 'live';
const APP_DIR = process.env.APP_DIR || '/home/ubuntu/wannfahrma-v1';
const WEBHOOK_URL = 'http://webhooks.wartenis.org/webhook/';

// Middleware to parse JSON
webhookApp.use(express.json());

// Middleware to verify GitHub webhook signature
function verifySignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    if (!signature) {
        console.log('❌ No signature provided');
        return res.status(401).send('No signature provided');
    }
    
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload, 'utf8').digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        console.log('❌ Invalid signature');
        return res.status(401).send('Invalid signature');
    }
    
    next();
}

// Log function with timestamp
function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    
    // Write to log file
    const logFile = path.join(APP_DIR, 'logs', 'webhook.log');
    fs.appendFileSync(logFile, logMessage + '\n');
}

// Execute shell command with promise
function execCommand(command, cwd = APP_DIR) {
    return new Promise((resolve, reject) => {
        log(`Executing: ${command}`, 'CMD');
        
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                log(`Command failed: ${error.message}`, 'ERROR');
                reject(error);
                return;
            }
            
            if (stderr) {
                log(`Command stderr: ${stderr}`, 'WARN');
            }
            
            if (stdout) {
                log(`Command stdout: ${stdout}`, 'SUCCESS');
            }
            
            resolve({ stdout, stderr });
        });
    });
}

// Main deployment function
async function deployUpdate() {
    const deployStart = Date.now();
    log('🚀 Starting deployment process...', 'DEPLOY');
    
    try {
        // 1. Stop the application
        log('⏹️ Stopping PM2 application...', 'DEPLOY');
        try {
            await execCommand('pm2 stop wannfahrma');
        } catch (error) {
            log('PM2 stop failed (app might not be running)', 'WARN');
        }
        
        // 2. Backup current version
        const backupDir = path.join(APP_DIR, '..', `backup-${Date.now()}`);
        log(`📦 Creating backup: ${backupDir}`, 'DEPLOY');
        await execCommand(`cp -r ${APP_DIR} ${backupDir}`);
        
        // 3. Change to app directory
        process.chdir(APP_DIR);
        
        // 4. Fetch latest changes
        log('📥 Fetching latest changes from GitHub...', 'DEPLOY');
        await execCommand('git fetch origin');
        
        // 5. Check current branch
        const { stdout: currentBranch } = await execCommand('git branch --show-current');
        log(`Current branch: ${currentBranch.trim()}`, 'DEPLOY');
        
        // 6. Switch to live branch if not already on it
        if (currentBranch.trim() !== TARGET_BRANCH) {
            log(`🔄 Switching to ${TARGET_BRANCH} branch...`, 'DEPLOY');
            await execCommand(`git checkout ${TARGET_BRANCH}`);
        }
        
        // 7. Pull latest changes
        log('⬇️ Pulling latest changes...', 'DEPLOY');
        await execCommand(`git pull origin ${TARGET_BRANCH}`);
        
        // 8. Install/update dependencies
        log('📦 Installing/updating dependencies...', 'DEPLOY');
        await execCommand('npm ci --production');
        
        // 9. Run any database migrations or setup tasks
        log('🔧 Running setup tasks...', 'DEPLOY');
        // Add any specific setup commands here if needed
        
        // 10. Start the application
        log('🚀 Starting PM2 application...', 'DEPLOY');
        await execCommand('pm2 start scripts/deployment/ecosystem.config.js');
        await execCommand('pm2 save');
        
        // 11. Health check
        log('❤️ Performing health check...', 'DEPLOY');
        
        // Wait a bit for the app to start
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
            await execCommand('curl -f http://localhost:3000/health');
            log('✅ Health check passed', 'DEPLOY');
        } catch (error) {
            log('⚠️ Health check failed, but continuing...', 'WARN');
        }
        
        const deployTime = Date.now() - deployStart;
        log(`🎉 Deployment completed successfully in ${deployTime}ms`, 'SUCCESS');
        
        return { success: true, deployTime };
        
    } catch (error) {
        log(`❌ Deployment failed: ${error.message}`, 'ERROR');
        
        // Attempt rollback
        try {
            log('🔄 Attempting rollback...', 'DEPLOY');
            await execCommand('pm2 restart wannfahrma');
        } catch (rollbackError) {
            log(`❌ Rollback failed: ${rollbackError.message}`, 'ERROR');
        }
        
        throw error;
    }
}

// GitHub webhook endpoint
webhookApp.post('/webhook', verifySignature, async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;
    
    log(`📨 Received GitHub webhook: ${event}`, 'WEBHOOK');
    
    // Only handle push events
    if (event !== 'push') {
        log(`Ignoring ${event} event`, 'WEBHOOK');
        return res.status(200).send('Event ignored');
    }
    
    // Check if push is to the target branch
    const ref = payload.ref;
    const targetRef = `refs/heads/${TARGET_BRANCH}`;
    
    if (ref !== targetRef) {
        log(`Push to ${ref}, ignoring (only watching ${targetRef})`, 'WEBHOOK');
        return res.status(200).send(`Ignoring push to ${ref}`);
    }
    
    // Log push details
    const commits = payload.commits || [];
    const committer = payload.pusher?.name || 'unknown';
    const commitCount = commits.length;
    
    log(`🔄 Push to ${TARGET_BRANCH} branch detected:`, 'WEBHOOK');
    log(`   Committer: ${committer}`, 'WEBHOOK');
    log(`   Commits: ${commitCount}`, 'WEBHOOK');
    
    commits.forEach((commit, index) => {
        log(`   ${index + 1}. ${commit.message} (${commit.id.substring(0, 7)})`, 'WEBHOOK');
    });
    
    // Respond immediately to GitHub
    res.status(200).send('Deployment started');
    
    // Start deployment asynchronously
    try {
        const result = await deployUpdate();
        log(`✅ Webhook deployment completed: ${JSON.stringify(result)}`, 'SUCCESS');
    } catch (error) {
        log(`❌ Webhook deployment failed: ${error.message}`, 'ERROR');
    }
});

// Health check endpoint for the webhook service
webhookApp.get('/webhook/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'wann-fahrma-webhook',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        target_branch: TARGET_BRANCH,
        app_dir: APP_DIR
    });
});

// Manual deployment endpoint (for testing)
webhookApp.post('/webhook/deploy', verifySignature, async (req, res) => {
    log('🔧 Manual deployment triggered', 'MANUAL');
    
    try {
        const result = await deployUpdate();
        res.json({
            success: true,
            message: 'Deployment completed',
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
webhookApp.use((error, req, res, next) => {
    log(`❌ Webhook server error: ${error.message}`, 'ERROR');
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Start the webhook server
webhookApp.listen(WEBHOOK_PORT, () => {
    log(`🎣 GitHub Webhook Listener started`, 'STARTUP');
    log(`   Port: ${WEBHOOK_PORT}`, 'STARTUP');
    log(`   Target Branch: ${TARGET_BRANCH}`, 'STARTUP');
    log(`   App Directory: ${APP_DIR}`, 'STARTUP');
    log(`   Health Check: http://localhost:${WEBHOOK_PORT}/webhook/health`, 'STARTUP');
    log(`   Webhook URL: ${WEBHOOK_URL}`, 'STARTUP');
    log(`   GitHub Setup: Repository → Settings → Webhooks → Add webhook`, 'STARTUP');
    
    // Ensure log directory exists
    const logDir = path.join(APP_DIR, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
});

module.exports = webhookApp;
