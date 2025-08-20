const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple rate limiting without external library
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 50; // 50 requests per minute

function rateLimit(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, []);
    }
    
    const requests = rateLimitMap.get(clientIP);
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (validRequests.length >= RATE_LIMIT_MAX) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Zu viele Anfragen. Bitte warten Sie eine Minute bevor Sie es erneut versuchen.',
            type: 'RATE_LIMIT'
        });
    }
    
    validRequests.push(now);
    rateLimitMap.set(clientIP, validRequests);
    next();
}

// Cache for API responses (simple in-memory cache)
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

app.use(rateLimit);
app.use(express.static('.'));
app.use(express.json());

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Text colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m'
};

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Helper function to get client type from User-Agent
function getClientType(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    // Android detection
    if (ua.includes('android')) {
        return 'android';
    }
    
    // iOS detection
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        return 'mobile';
    }
    
    // Mobile browsers
    if (ua.includes('mobile') || ua.includes('mobi')) {
        return 'mobile';
    }
    
    // Desktop browsers
    if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
        return 'desktop';
    }
    
    // Bots/Crawlers
    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
        return 'bot';
    }
    
    return 'unknown';
}

// Enhanced logging function with colors and request grouping
let requestCounter = 0;
function logAPIRequest(ip, userAgent, endpoint, statusCode, requestType, additionalInfo = '', requestId = null) {
    if (!requestId) {
        requestCounter++;
        requestId = requestCounter.toString().padStart(4, '0');
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const clientType = getClientType(userAgent);
    
    // Different colors for different request types
    let color = colors.reset;
    let prefix = '';
    
    if (requestType.includes('INCOMING')) {
        color = colors.blue;
        prefix = '📥 IN ';
    } else if (requestType.includes('EXTERNAL')) {
        color = colors.green;
        prefix = '📤 OUT';
    } else if (requestType.includes('ERROR') || statusCode >= 400) {
        color = colors.red;
        prefix = '❌ ERR';
    } else if (requestType.includes('CACHE')) {
        color = colors.yellow;
        prefix = '💾 CHE';
    } else {
        color = colors.cyan;
        prefix = '🔄 INT';
    }
    
    // Console output with colors
    const logLine = `${color}[${requestId}] ${prefix} [${timestamp}][${clientType}][${ip}][${requestType}][${statusCode}][${endpoint}]${colors.reset}`;
    console.log(logLine + (additionalInfo ? ` ${colors.dim}${additionalInfo}${colors.reset}` : ''));
    
    // File output without colors
    const fileLogLine = `[${requestId}] [${timestamp}][${clientType}][${ip}][${requestType}][${statusCode}][${endpoint}]${additionalInfo ? ` ${additionalInfo}` : ''}`;
    
    // Write to log file
    try {
        fs.appendFileSync(path.join(logsDir, 'api_logs.log'), fileLogLine + '\n');
    } catch (error) {
        console.error('❌ Fehler beim Schreiben in Log-Datei:', error.message);
    }
    
    return requestId;
}

// Middleware to log all incoming requests
app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Generate request ID for this request
    const requestId = logAPIRequest(
        clientIP, 
        userAgent, 
        req.originalUrl, 
        '-', 
        'INCOMING_REQUEST', 
        `${req.method} ${req.originalUrl}`
    );
    
    // Store request ID in request object for response logging
    req.requestId = requestId;
    req.startTime = Date.now();
    
    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(data) {
        const responseTime = Date.now() - req.startTime;
        const statusCode = res.statusCode;
        
        logAPIRequest(
            clientIP,
            userAgent,
            req.originalUrl,
            statusCode,
            'INCOMING_RESPONSE',
            `${responseTime}ms`,
            requestId
        );
        
        return originalJson.call(this, data);
    };
    
    next();
});

// API endpoint for departures
app.get('/api/departures/:rbl', async (req, res) => {
    const rbl = req.params.rbl;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Validate RBL parameter (allow integers and floats)
    if (!rbl || !/^\d+(\.\d+)?$/.test(rbl)) {
        logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 400, 'VALIDATION_ERROR', 'Invalid RBL format', req.requestId);
        return res.status(400).json({
            error: 'Ungültige RBL',
            message: 'Die RBL-Nummer muss eine positive Zahl sein.',
            type: 'VALIDATION_ERROR'
        });
    }
    
    const cacheKey = `departures_${rbl}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 200, 'CACHE_HIT', 'Data from cache', req.requestId);
            return res.json(cached.data);
        } else {
            cache.delete(cacheKey);
        }
    }
    
    try {
        // External API call with detailed logging
        const apiUrl = `http://www.wienerlinien.at/ogd_realtime/monitor?rbl=${rbl}&sender=WannFahrmaOIDA`;
        const extRequestId = logAPIRequest(clientIP, userAgent, apiUrl, '-', 'EXTERNAL_REQUEST', 'Calling Wiener Linien API', req.requestId);
        
        const startTime = Date.now();
        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'WannFahrmaOIDA/1.0 (Development)'
            }
        });
        const responseTime = Date.now() - startTime;
        
        logAPIRequest(clientIP, userAgent, apiUrl, response.status, 'EXTERNAL_RESPONSE', `${responseTime}ms - ${JSON.stringify(response.data).length} bytes`, extRequestId);
        
        // Process the response
        if (response.data && response.data.data && response.data.data.monitors) {
            const monitors = response.data.data.monitors;
            
            if (monitors.length === 0) {
                logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 404, 'NO_DATA', 'No monitors found for RBL', req.requestId);
                return res.status(404).json({
                    error: 'Keine Daten',
                    message: 'Für diese RBL-Nummer wurden keine Abfahrten gefunden.',
                    type: 'NO_DATA'
                });
            }
            
            // Cache successful response
            cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            
            logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 200, 'SUCCESS', `${monitors.length} monitors found`, req.requestId);
            res.json(response.data);
            
        } else {
            logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 500, 'INVALID_RESPONSE', 'Invalid API response structure', req.requestId);
            res.status(500).json({
                error: 'Ungültige Antwort',
                message: 'Die API hat eine ungültige Antwort zurückgegeben.',
                type: 'INVALID_RESPONSE'
            });
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Fehler beim Laden der Abfahrten für RBL ${rbl}:${colors.reset}`, error.message);
        
        // Different error types with specific logging
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 503, 'CONNECTION_ERROR', `External API unreachable: ${error.code}`, req.requestId);
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Die Wiener Linien API ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.',
                type: 'CONNECTION_ERROR'
            });
        }
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 504, 'TIMEOUT_ERROR', 'Request timeout after 15s', req.requestId);
            return res.status(504).json({
                error: 'Zeitüberschreitung',
                message: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
                type: 'TIMEOUT_ERROR'
            });
        }
        
        // HTTP errors from external API
        if (error.response) {
            const status = error.response.status;
            const apiData = error.response.data;
            
            logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, status, 'HTTP_ERROR', `WL API returned ${status}`, req.requestId);
            
            if (status === 403) {
                return res.status(403).json({
                    error: 'Zugriff verweigert',
                    message: 'Keine Berechtigung für die Wiener Linien API.',
                    type: 'ACCESS_DENIED'
                });
            }
            
            if (status === 404) {
                return res.status(404).json({
                    error: 'RBL nicht gefunden',
                    message: 'Die angegebene RBL-Nummer existiert nicht.',
                    type: 'NOT_FOUND'
                });
            }
            
            return res.status(status).json({
                error: 'API-Fehler',
                message: `Die Wiener Linien API hat einen Fehler zurückgegeben (${status}).`,
                type: 'API_ERROR',
                details: apiData?.message?.value || error.message
            });
        }
        
        // General error
        logAPIRequest(clientIP, userAgent, `/api/departures/${rbl}`, 500, 'GENERAL_ERROR', error.message, req.requestId);
        res.status(500).json({
            error: 'Serverfehler',
            message: 'Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
            type: 'UNKNOWN_ERROR'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    logAPIRequest(clientIP, userAgent, req.originalUrl, 500, 'SERVER_ERROR', err.message, req.requestId);
    console.error(`${colors.red}Server error:${colors.reset}`, err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`${colors.bright}${colors.green}🚇 wann fahrma OIDA Server gestartet! (DEV)${colors.reset}`);
    console.log(`${colors.cyan}📱 App verfügbar unter: http://localhost:${PORT}${colors.reset}`);
    console.log(`${colors.cyan}🔌 API verfügbar unter: http://localhost:${PORT}/api/departures/:rbl${colors.reset}`);
    console.log(`${colors.cyan}❤️  Health Check: http://localhost:${PORT}/health${colors.reset}`);
    console.log(`${colors.yellow}📋 Log-Datei: ${path.join(logsDir, 'api_logs.log')}${colors.reset}`);
    console.log('');
    console.log(`${colors.bright}Logging-System:${colors.reset}`);
    console.log(`${colors.blue}📥 IN  = Eingehende Requests${colors.reset}`);
    console.log(`${colors.green}📤 OUT = Ausgehende API-Calls${colors.reset}`);
    console.log(`${colors.yellow}💾 CHE = Cache-Zugriffe${colors.reset}`);
    console.log(`${colors.red}❌ ERR = Fehler${colors.reset}`);
    console.log(`${colors.cyan}🔄 INT = Interne Operationen${colors.reset}`);
    console.log('');
    console.log('Zum Stoppen: Ctrl+C');
});

module.exports = app;
