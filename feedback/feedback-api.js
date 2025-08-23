const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.FEEDBACK_PORT || 3002;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// CORS für Frontend-Integration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Paths
const feedbackDataDir = path.join(__dirname, 'data');
const feedbackLogsDir = path.join(__dirname, 'logs');

// Ensure directories exist
if (!fs.existsSync(feedbackDataDir)) {
    fs.mkdirSync(feedbackDataDir, { recursive: true });
}
if (!fs.existsSync(feedbackLogsDir)) {
    fs.mkdirSync(feedbackLogsDir, { recursive: true });
}

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

// Logging function
function logFeedback(action, data, ip = 'unknown') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${action} from ${ip}: ${JSON.stringify(data)}\n`;
    
    console.log(`${colors.blue}📝 FEEDBACK ${colors.reset}${colors.dim}[${timestamp}]${colors.reset} ${action} from ${colors.cyan}${ip}${colors.reset}`);
    
    try {
        fs.appendFileSync(path.join(feedbackLogsDir, 'feedback.log'), logEntry);
    } catch (error) {
        console.error('❌ Error writing to feedback log:', error.message);
    }
}

// Generate unique ID
function generateId() {
    return crypto.randomBytes(8).toString('hex');
}

// Get client IP
function getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           'unknown';
}

// Save feedback to structured file
function saveFeedback(feedback) {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD
    const feedbackFile = path.join(feedbackDataDir, `feedback_${dateStr}.json`);
    
    // Read existing feedback for the day
    let dailyFeedback = [];
    if (fs.existsSync(feedbackFile)) {
        try {
            const data = fs.readFileSync(feedbackFile, 'utf8');
            dailyFeedback = JSON.parse(data);
        } catch (error) {
            console.error('Error reading existing feedback file:', error.message);
            dailyFeedback = [];
        }
    }
    
    // Add new feedback
    dailyFeedback.push(feedback);
    
    // Save back to file
    try {
        fs.writeFileSync(feedbackFile, JSON.stringify(dailyFeedback, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving feedback:', error.message);
        return false;
    }
}

// API Routes

// POST /api/feedback - Submit new feedback
app.post('/api/feedback', (req, res) => {
    const clientIP = getClientIP(req);
    const timestamp = new Date().toISOString();
    const feedbackId = generateId();
    
    // Validate required fields
    const { message, type, rating, userAgent } = req.body;
    
    if (!message || message.trim().length === 0) {
        logFeedback('VALIDATION_ERROR', { error: 'Message required', ip: clientIP }, clientIP);
        return res.status(400).json({
            error: 'Message is required',
            code: 'MISSING_MESSAGE'
        });
    }
    
    // Create feedback object
    const feedback = {
        id: feedbackId,
        timestamp: timestamp,
        message: message.trim(),
        type: type || 'general', // general, bug, feature, improvement
        rating: rating || null, // 1-5 stars
        ip: clientIP,
        userAgent: userAgent || req.get('User-Agent') || 'unknown',
        metadata: {
            url: req.body.url || null,
            page: req.body.page || null,
            browser: req.body.browser || null,
            screen: req.body.screen || null,
            additional: req.body.additional || null
        }
    };
    
    // Save feedback
    const saved = saveFeedback(feedback);
    
    if (saved) {
        logFeedback('FEEDBACK_SAVED', { 
            id: feedbackId, 
            type: feedback.type, 
            rating: feedback.rating,
            messageLength: message.length 
        }, clientIP);
        
        res.status(201).json({
            success: true,
            id: feedbackId,
            message: 'Feedback saved successfully',
            timestamp: timestamp
        });
    } else {
        logFeedback('SAVE_ERROR', { id: feedbackId }, clientIP);
        res.status(500).json({
            error: 'Failed to save feedback',
            code: 'SAVE_ERROR'
        });
    }
});

// GET /api/feedback/stats - Get basic statistics
app.get('/api/feedback/stats', (req, res) => {
    const clientIP = getClientIP(req);
    
    try {
        const files = fs.readdirSync(feedbackDataDir)
            .filter(file => file.startsWith('feedback_') && file.endsWith('.json'));
        
        let totalCount = 0;
        let typeStats = {};
        let ratingStats = {};
        let dailyStats = {};
        
        files.forEach(file => {
            try {
                const data = fs.readFileSync(path.join(feedbackDataDir, file), 'utf8');
                const dailyFeedback = JSON.parse(data);
                const date = file.replace('feedback_', '').replace('.json', '');
                
                dailyStats[date] = dailyFeedback.length;
                totalCount += dailyFeedback.length;
                
                dailyFeedback.forEach(feedback => {
                    // Type statistics
                    typeStats[feedback.type] = (typeStats[feedback.type] || 0) + 1;
                    
                    // Rating statistics
                    if (feedback.rating) {
                        ratingStats[feedback.rating] = (ratingStats[feedback.rating] || 0) + 1;
                    }
                });
            } catch (error) {
                console.error(`Error reading file ${file}:`, error.message);
            }
        });
        
        const stats = {
            total: totalCount,
            files: files.length,
            types: typeStats,
            ratings: ratingStats,
            daily: dailyStats,
            generated: new Date().toISOString()
        };
        
        logFeedback('STATS_REQUEST', { total: totalCount }, clientIP);
        
        res.json(stats);
    } catch (error) {
        logFeedback('STATS_ERROR', { error: error.message }, clientIP);
        res.status(500).json({
            error: 'Failed to generate statistics',
            code: 'STATS_ERROR'
        });
    }
});

// GET /api/feedback/recent - Get recent feedback (last 24h)
app.get('/api/feedback/recent', (req, res) => {
    const clientIP = getClientIP(req);
    const limit = parseInt(req.query.limit) || 10;
    
    try {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        let recentFeedback = [];
        
        // Check last 2 days of files
        for (let i = 0; i < 2; i++) {
            const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = checkDate.toISOString().split('T')[0];
            const file = path.join(feedbackDataDir, `feedback_${dateStr}.json`);
            
            if (fs.existsSync(file)) {
                try {
                    const data = fs.readFileSync(file, 'utf8');
                    const dailyFeedback = JSON.parse(data);
                    
                    // Filter feedback from last 24h
                    const filtered = dailyFeedback.filter(feedback => {
                        const feedbackTime = new Date(feedback.timestamp);
                        return feedbackTime >= yesterday;
                    });
                    
                    recentFeedback.push(...filtered);
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error.message);
                }
            }
        }
        
        // Sort by timestamp (newest first) and limit
        recentFeedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        recentFeedback = recentFeedback.slice(0, limit);
        
        // Remove sensitive data for public API
        const sanitized = recentFeedback.map(feedback => ({
            id: feedback.id,
            timestamp: feedback.timestamp,
            type: feedback.type,
            rating: feedback.rating,
            message: feedback.message,
            metadata: {
                page: feedback.metadata?.page,
                browser: feedback.metadata?.browser
            }
        }));
        
        logFeedback('RECENT_REQUEST', { count: sanitized.length, limit }, clientIP);
        
        res.json({
            count: sanitized.length,
            feedback: sanitized,
            generated: new Date().toISOString()
        });
    } catch (error) {
        logFeedback('RECENT_ERROR', { error: error.message }, clientIP);
        res.status(500).json({
            error: 'Failed to get recent feedback',
            code: 'RECENT_ERROR'
        });
    }
});

// GET /health - Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'feedback-api',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    const clientIP = getClientIP(req);
    console.error(`${colors.red}❌ Feedback API Error:${colors.reset}`, err);
    logFeedback('SERVER_ERROR', { error: err.message }, clientIP);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    const clientIP = getClientIP(req);
    logFeedback('NOT_FOUND', { url: req.originalUrl, method: req.method }, clientIP);
    res.status(404).json({ 
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        available: [
            'POST /api/feedback',
            'GET /api/feedback/stats',
            'GET /api/feedback/recent',
            'GET /health'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`${colors.bright}${colors.green}📝 Feedback API gestartet!${colors.reset}`);
    console.log(`${colors.cyan}🌐 API verfügbar unter: http://localhost:${PORT}${colors.reset}`);
    console.log(`${colors.cyan}📊 Feedback senden: POST http://localhost:${PORT}/api/feedback${colors.reset}`);
    console.log(`${colors.cyan}📈 Statistiken: GET http://localhost:${PORT}/api/feedback/stats${colors.reset}`);
    console.log(`${colors.cyan}🕒 Aktuell: GET http://localhost:${PORT}/api/feedback/recent${colors.reset}`);
    console.log(`${colors.cyan}❤️  Health Check: http://localhost:${PORT}/health${colors.reset}`);
    console.log(`${colors.yellow}📁 Daten-Ordner: ${feedbackDataDir}${colors.reset}`);
    console.log(`${colors.yellow}📋 Log-Ordner: ${feedbackLogsDir}${colors.reset}`);
    console.log('');
    console.log('Zum Stoppen: Ctrl+C');
});

module.exports = app;
