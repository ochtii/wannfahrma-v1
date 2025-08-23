const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || process.env.FEEDBACK_PORT || 3002;

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
const configFile = path.join(__dirname, 'config.json');

// Admin configuration
const DEFAULT_CONFIG = {
    adminPassword: 'admin123', // Change this in production!
    feedbackStatuses: [
        'neu',
        'in_bearbeitung', 
        'geloest',
        'vorgemerkt',
        'abgelehnt'
    ]
};

// Load or create config
let config = DEFAULT_CONFIG;
try {
    if (fs.existsSync(configFile)) {
        const configData = fs.readFileSync(configFile, 'utf8');
        config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    } else {
        // Create default config file
        fs.writeFileSync(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log(`${colors.yellow}📝 Created default config file: ${configFile}${colors.reset}`);
        console.log(`${colors.yellow}⚠️  Please change the default admin password!${colors.reset}`);
    }
} catch (error) {
    console.error(`${colors.red}❌ Error loading config:${colors.reset}`, error.message);
    config = DEFAULT_CONFIG;
}

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
    const { message, type, rating, userAgent, name, contact } = req.body;
    
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
        name: name ? name.trim() : null, // Optional sender name
        contact: contact ? contact.trim() : null, // Optional contact info
        status: 'neu', // Default status
        ip: clientIP,
        userAgent: userAgent || req.get('User-Agent') || 'unknown',
        metadata: {
            url: req.body.url || null,
            page: req.body.page || null,
            browser: req.body.browser || null,
            screen: req.body.screen || null,
            platform: req.body.platform || null,
            additional: req.body.additional || null
        },
        admin: {
            lastModified: timestamp,
            notes: null
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

// GET /api/feedback/recent - Get recent feedback with enhanced filtering
app.get('/api/feedback/recent', (req, res) => {
    const clientIP = getClientIP(req);
    const limit = parseInt(req.query.limit) || 25;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    // Parse filters
    const timeFilter = req.query.timeFilter || '24h';
    const typeFilter = req.query.type || '';
    const platformFilter = req.query.platform || '';
    const fromDate = req.query.from ? new Date(req.query.from) : null;
    const toDate = req.query.to ? new Date(req.query.to + 'T23:59:59.999Z') : null;
    
    try {
        const now = new Date();
        let startDate, endDate = now;
        
        // Calculate date range based on filter
        switch (timeFilter) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '31d':
                startDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'custom':
                startDate = fromDate || new Date('2024-01-01');
                endDate = toDate || now;
                break;
            case 'all':
            default:
                startDate = new Date('2024-01-01'); // Very old date to get all
                break;
        }
        
        let allFeedback = [];
        
        // Determine which files to check based on date range
        const daysToCheck = timeFilter === 'all' ? 365 : Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
        
        for (let i = 0; i < daysToCheck; i++) {
            const checkDate = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = checkDate.toISOString().split('T')[0];
            const file = path.join(feedbackDataDir, `feedback_${dateStr}.json`);
            
            if (fs.existsSync(file)) {
                try {
                    const data = fs.readFileSync(file, 'utf8');
                    const dailyFeedback = JSON.parse(data);
                    allFeedback.push(...dailyFeedback);
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error.message);
                }
            }
        }
        
        // Apply filters
        let filteredFeedback = allFeedback.filter(feedback => {
            const feedbackTime = new Date(feedback.timestamp);
            
            // Date range filter
            if (feedbackTime < startDate || feedbackTime > endDate) {
                return false;
            }
            
            // Type filter
            if (typeFilter && feedback.type !== typeFilter) {
                return false;
            }
            
            // Platform filter
            if (platformFilter && feedback.platform !== platformFilter) {
                return false;
            }
            
            return true;
        });
        
        // Sort by timestamp (newest first)
        filteredFeedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Calculate pagination
        const total = filteredFeedback.length;
        const paginatedFeedback = filteredFeedback.slice(offset, offset + limit);
        
        // Remove sensitive data for public API
        const sanitized = paginatedFeedback.map(feedback => ({
            id: feedback.id,
            timestamp: feedback.timestamp,
            type: feedback.type,
            rating: feedback.rating,
            message: feedback.message,
            name: feedback.name,
            platform: feedback.platform,
            contact: feedback.contact,
            status: feedback.status,
            metadata: {
                page: feedback.metadata?.page,
                browser: feedback.metadata?.browser
            }
        }));
        
        logFeedback('RECENT_REQUEST', { 
            filtered: sanitized.length, 
            total: total,
            filters: { timeFilter, typeFilter, platformFilter },
            page: page,
            limit: limit 
        }, clientIP);
        
        res.json({
            feedback: sanitized,
            filtered: sanitized.length,
            total: total,
            page: page,
            totalPages: Math.ceil(total / limit),
            filters: {
                timeFilter,
                typeFilter,
                platformFilter,
                dateRange: timeFilter === 'custom' ? { from: fromDate, to: toDate } : null
            },
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

// Admin authentication middleware
function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const password = authHeader.substring(7); // Remove 'Bearer '
    if (password !== config.adminPassword) {
        return res.status(403).json({ error: 'Invalid admin password' });
    }
    
    next();
}

// POST /api/admin/login - Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const clientIP = getClientIP(req);
    
    if (password === config.adminPassword) {
        logFeedback('ADMIN_LOGIN_SUCCESS', {}, clientIP);
        res.json({ 
            success: true, 
            token: password, // Simple token approach
            message: 'Admin login successful' 
        });
    } else {
        logFeedback('ADMIN_LOGIN_FAILED', {}, clientIP);
        res.status(401).json({ error: 'Invalid password' });
    }
});

// GET /api/admin/feedbacks - Get all feedbacks with admin info
app.get('/api/admin/feedbacks', adminAuth, (req, res) => {
    const clientIP = getClientIP(req);
    
    try {
        const { limit, status, type } = req.query;
        const allFeedbacks = [];
        
        // Read all feedback files
        const files = fs.readdirSync(feedbackDataDir)
            .filter(file => file.startsWith('feedback_') && file.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a)); // Newest first
        
        for (const file of files) {
            try {
                const filePath = path.join(feedbackDataDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                allFeedbacks.push(...data);
            } catch (error) {
                console.error(`Error reading ${file}:`, error.message);
            }
        }
        
        // Filter feedbacks
        let filteredFeedbacks = allFeedbacks;
        
        if (status) {
            filteredFeedbacks = filteredFeedbacks.filter(f => f.status === status);
        }
        
        if (type) {
            filteredFeedbacks = filteredFeedbacks.filter(f => f.type === type);
        }
        
        // Sort by timestamp (newest first)
        filteredFeedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply limit
        if (limit) {
            filteredFeedbacks = filteredFeedbacks.slice(0, parseInt(limit));
        }
        
        logFeedback('ADMIN_FEEDBACKS_FETCHED', { count: filteredFeedbacks.length }, clientIP);
        
        res.json({
            feedbacks: filteredFeedbacks,
            total: allFeedbacks.length,
            filtered: filteredFeedbacks.length,
            availableStatuses: config.feedbackStatuses
        });
        
    } catch (error) {
        console.error('Error fetching admin feedbacks:', error);
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
});

// PUT /api/admin/feedback/:id - Update feedback status/notes
app.put('/api/admin/feedback/:id', adminAuth, (req, res) => {
    const feedbackId = req.params.id;
    const { status, notes } = req.body;
    const clientIP = getClientIP(req);
    
    try {
        // Find and update feedback
        const files = fs.readdirSync(feedbackDataDir)
            .filter(file => file.startsWith('feedback_') && file.endsWith('.json'));
        
        let feedbackFound = false;
        
        for (const file of files) {
            const filePath = path.join(feedbackDataDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const feedbackIndex = data.findIndex(f => f.id === feedbackId);
            
            if (feedbackIndex !== -1) {
                // Update feedback
                if (status && config.feedbackStatuses.includes(status)) {
                    data[feedbackIndex].status = status;
                }
                
                if (notes !== undefined) {
                    data[feedbackIndex].admin.notes = notes;
                }
                
                data[feedbackIndex].admin.lastModified = new Date().toISOString();
                
                // Save updated data
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                
                logFeedback('ADMIN_FEEDBACK_UPDATED', { 
                    id: feedbackId, 
                    status: data[feedbackIndex].status,
                    hasNotes: !!notes 
                }, clientIP);
                
                res.json({
                    success: true,
                    feedback: data[feedbackIndex],
                    message: 'Feedback updated successfully'
                });
                
                feedbackFound = true;
                break;
            }
        }
        
        if (!feedbackFound) {
            res.status(404).json({ error: 'Feedback not found' });
        }
        
    } catch (error) {
        console.error('Error updating feedback:', error);
        res.status(500).json({ error: 'Failed to update feedback' });
    }
});

// DELETE /api/admin/feedback/:id - Delete feedback
app.delete('/api/admin/feedback/:id', adminAuth, (req, res) => {
    const feedbackId = req.params.id;
    const clientIP = getClientIP(req);
    
    try {
        // Find and delete feedback
        const files = fs.readdirSync(feedbackDataDir)
            .filter(file => file.startsWith('feedback_') && file.endsWith('.json'));
        
        let feedbackFound = false;
        let deletedFeedback = null;
        
        for (const file of files) {
            const filePath = path.join(feedbackDataDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const feedbackIndex = data.findIndex(f => f.id === feedbackId);
            
            if (feedbackIndex !== -1) {
                // Store deleted feedback for logging
                deletedFeedback = data[feedbackIndex];
                
                // Remove feedback from array
                data.splice(feedbackIndex, 1);
                
                // Save updated data
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                
                logFeedback('ADMIN_FEEDBACK_DELETED', { 
                    id: feedbackId, 
                    type: deletedFeedback.type,
                    deletedBy: 'admin'
                }, clientIP);
                
                res.json({
                    success: true,
                    message: 'Feedback deleted successfully',
                    deletedId: feedbackId
                });
                
                feedbackFound = true;
                break;
            }
        }
        
        if (!feedbackFound) {
            res.status(404).json({ error: 'Feedback not found' });
        }
        
    } catch (error) {
        console.error('Error deleting feedback:', error);
        logFeedback('ADMIN_DELETE_ERROR', { id: feedbackId, error: error.message }, clientIP);
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
});

// GET /api/admin/stats - Enhanced admin statistics
app.get('/api/admin/stats', adminAuth, (req, res) => {
    const clientIP = getClientIP(req);
    
    try {
        const stats = {
            total: 0,
            byStatus: {},
            byType: {},
            byRating: {},
            recentActivity: [],
            topIssues: []
        };
        
        // Initialize status counts
        config.feedbackStatuses.forEach(status => {
            stats.byStatus[status] = 0;
        });
        
        // Read all feedback files
        const files = fs.readdirSync(feedbackDataDir)
            .filter(file => file.startsWith('feedback_') && file.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a));
        
        for (const file of files) {
            try {
                const filePath = path.join(feedbackDataDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                data.forEach(feedback => {
                    stats.total++;
                    
                    // Count by status
                    const status = feedback.status || 'neu';
                    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
                    
                    // Count by type
                    const type = feedback.type || 'general';
                    stats.byType[type] = (stats.byType[type] || 0) + 1;
                    
                    // Count by rating
                    if (feedback.rating) {
                        stats.byRating[feedback.rating] = (stats.byRating[feedback.rating] || 0) + 1;
                    }
                });
            } catch (error) {
                console.error(`Error reading ${file}:`, error.message);
            }
        }
        
        logFeedback('ADMIN_STATS_FETCHED', { total: stats.total }, clientIP);
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error generating admin stats:', error);
        res.status(500).json({ error: 'Failed to generate admin statistics' });
    }
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
            'POST /api/admin/login',
            'GET /api/admin/feedbacks',
            'PUT /api/admin/feedback/:id',
            'GET /api/admin/stats',
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
