const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// .env Loader
const envLoader = require('./env-loader');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple rate limiting without external library
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 50; // 50 requests per minute

function rateLimit(req, res, next) {
    const clientIP = getRealClientIP(req);
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

// Trust proxy for real IP detection (important for production behind nginx/load balancer)
app.set('trust proxy', true);

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

// Advanced User-Agent parsing for detailed client type detection
function getClientType(userAgent) {
    if (!userAgent || userAgent === 'unknown' || userAgent === '') return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    // Bots and Crawlers (check first to avoid false positives)
    if (ua.includes('googlebot') || ua.includes('bingbot') || ua.includes('slurp') || 
        ua.includes('duckduckbot') || ua.includes('baiduspider') || ua.includes('yandexbot') ||
        ua.includes('facebookexternalhit') || ua.includes('twitterbot') || ua.includes('linkedinbot') ||
        ua.includes('whatsapp') || ua.includes('telegrambot') || ua.includes('discordbot') ||
        ua.includes('crawler') || ua.includes('spider') || ua.includes('scraper')) {
        
        // Specific bot identification
        if (ua.includes('googlebot')) return 'google-bot';
        if (ua.includes('bingbot')) return 'bing-bot';
        if (ua.includes('facebookexternalhit')) return 'facebook-bot';
        if (ua.includes('twitterbot')) return 'twitter-bot';
        if (ua.includes('whatsapp')) return 'whatsapp-bot';
        if (ua.includes('telegrambot')) return 'telegram-bot';
        return 'bot';
    }
    
    // API Clients and Development Tools
    if (ua.includes('postman') || ua.includes('insomnia') || ua.includes('paw') ||
        ua.includes('curl') || ua.includes('wget') || ua.includes('httpie') ||
        ua.includes('axios') || ua.includes('fetch') || ua.includes('node-fetch') ||
        ua.includes('python-requests') || ua.includes('python-urllib') ||
        ua.includes('java') || ua.includes('okhttp') || ua.includes('apache-httpclient')) {
        
        if (ua.includes('postman')) return 'postman';
        if (ua.includes('insomnia')) return 'insomnia';
        if (ua.includes('curl')) return 'curl';
        if (ua.includes('python')) return 'python-client';
        if (ua.includes('java')) return 'java-client';
        if (ua.includes('node')) return 'node-client';
        return 'api-client';
    }
    
    // Mobile Apps (native apps)
    if ((ua.includes('android') && !ua.includes('chrome') && !ua.includes('firefox')) ||
        (ua.includes('iphone') && !ua.includes('safari')) ||
        ua.includes('mobile app') || ua.includes('native')) {
        
        if (ua.includes('android')) return 'android-app';
        if (ua.includes('iphone') || ua.includes('ios')) return 'ios-app';
        return 'mobile-app';
    }
    
    // Mobile Browsers
    if (ua.includes('android')) {
        if (ua.includes('chrome')) return 'android-chrome';
        if (ua.includes('firefox')) return 'android-firefox';
        if (ua.includes('opera')) return 'android-opera';
        if (ua.includes('samsung')) return 'android-samsung';
        return 'android-browser';
    }
    
    // iOS Browsers
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        if (ua.includes('crios')) return 'ios-chrome';
        if (ua.includes('fxios')) return 'ios-firefox';
        if (ua.includes('opera')) return 'ios-opera';
        if (ua.includes('safari')) return 'ios-safari';
        return 'ios-browser';
    }
    
    // Desktop Browsers
    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
        if (ua.includes('windows')) return 'win-chrome';
        if (ua.includes('mac')) return 'mac-chrome';
        if (ua.includes('linux')) return 'linux-chrome';
        return 'chrome';
    }
    
    if (ua.includes('firefox')) {
        if (ua.includes('windows')) return 'win-firefox';
        if (ua.includes('mac')) return 'mac-firefox';
        if (ua.includes('linux')) return 'linux-firefox';
        return 'firefox';
    }
    
    if (ua.includes('safari') && !ua.includes('chrome')) {
        if (ua.includes('mac')) return 'mac-safari';
        return 'safari';
    }
    
    if (ua.includes('edg')) {
        if (ua.includes('windows')) return 'win-edge';
        if (ua.includes('mac')) return 'mac-edge';
        return 'edge';
    }
    
    if (ua.includes('opera') || ua.includes('opr')) {
        if (ua.includes('windows')) return 'win-opera';
        if (ua.includes('mac')) return 'mac-opera';
        return 'opera';
    }
    
    // Generic mobile detection
    if (ua.includes('mobile') || ua.includes('mobi') || ua.includes('phone')) {
        return 'mobile-generic';
    }
    
    // Generic desktop detection
    if (ua.includes('windows')) return 'windows-generic';
    if (ua.includes('macintosh') || ua.includes('mac os')) return 'mac-generic';
    if (ua.includes('linux') || ua.includes('ubuntu') || ua.includes('debian')) return 'linux-generic';
    
    // Smart TV and Gaming Consoles
    if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('tizen') ||
        ua.includes('webos') || ua.includes('roku') || ua.includes('chromecast')) {
        return 'smart-tv';
    }
    
    if (ua.includes('playstation') || ua.includes('xbox') || ua.includes('nintendo')) {
        return 'gaming-console';
    }
    
    // IoT and Embedded devices
    if (ua.includes('raspberry') || ua.includes('arduino') || ua.includes('esp32') ||
        ua.includes('embedded') || ua.includes('iot')) {
        return 'iot-device';
    }
    
    return 'unknown';
}

// Helper function to extract browser/device info for logging
function getUserAgentInfo(userAgent) {
    if (!userAgent || userAgent === 'unknown' || userAgent === '') return '';
    
    const ua = userAgent.toLowerCase();
    let info = [];
    
    // Extract version numbers
    const chromeMatch = ua.match(/chrome\/(\d+)/);
    const firefoxMatch = ua.match(/firefox\/(\d+)/);
    const safariMatch = ua.match(/version\/(\d+)/);
    const edgeMatch = ua.match(/edg\/(\d+)/);
    
    if (chromeMatch && !ua.includes('edg')) info.push(`Chrome/${chromeMatch[1]}`);
    if (firefoxMatch) info.push(`Firefox/${firefoxMatch[1]}`);
    if (safariMatch && ua.includes('safari') && !ua.includes('chrome')) info.push(`Safari/${safariMatch[1]}`);
    if (edgeMatch) info.push(`Edge/${edgeMatch[1]}`);
    
    // Extract OS info
    if (ua.includes('windows nt 10')) info.push('Windows 10/11');
    else if (ua.includes('windows nt 6.3')) info.push('Windows 8.1');
    else if (ua.includes('windows nt 6.1')) info.push('Windows 7');
    else if (ua.includes('windows')) info.push('Windows');
    
    if (ua.includes('mac os x')) {
        const macMatch = ua.match(/mac os x (\d+)[_.](\d+)/);
        if (macMatch) info.push(`macOS ${macMatch[1]}.${macMatch[2]}`);
        else info.push('macOS');
    }
    
    if (ua.includes('android')) {
        const androidMatch = ua.match(/android (\d+\.?\d*)/);
        if (androidMatch) info.push(`Android ${androidMatch[1]}`);
        else info.push('Android');
    }
    
    if (ua.includes('iphone os') || ua.includes('ios')) {
        const iosMatch = ua.match(/os (\d+)[_.](\d+)/);
        if (iosMatch) info.push(`iOS ${iosMatch[1]}.${iosMatch[2]}`);
        else info.push('iOS');
    }
    
    return info.length > 0 ? ` (${info.join(', ')})` : '';
}

// Helper function to get real client IP (important for production behind proxy)
function getRealClientIP(req) {
    // Try multiple sources in order of preference
    const possibleIPs = [
        req.headers['cf-connecting-ip'],     // Cloudflare
        req.headers['x-real-ip'],            // nginx
        req.headers['x-forwarded-for'],      // Standard proxy header
        req.headers['x-client-ip'],          // Apache
        req.headers['x-cluster-client-ip'],  // Cluster
        req.connection?.remoteAddress,       // Direct connection
        req.socket?.remoteAddress,           // Socket connection
        req.ip                               // Express default
    ];
    
    for (const ip of possibleIPs) {
        if (ip) {
            // Handle comma-separated IPs (x-forwarded-for can have multiple)
            const cleanedIP = ip.split(',')[0].trim();
            if (cleanedIP && cleanedIP !== 'unknown') {
                return cleanedIP;
            }
        }
    }
    
    return 'unknown';
}

// Helper function to clean IP address
function cleanIP(ip) {
    if (!ip) return 'unknown';
    
    // Remove IPv6 prefix for IPv4 addresses
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }
    
    // Localhost variations
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        return 'localhost';
    }
    
    return ip;
}

// Enhanced logging function with colors and request grouping
let requestCounter = 0;
function logAPIRequest(ip, userAgent, endpoint, statusCode, requestType, additionalInfo = '', requestId = null, referrer = null, origin = null) {
    if (!requestId) {
        requestCounter++;
        requestId = requestCounter.toString().padStart(4, '0');
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const clientType = getClientType(userAgent);
    const cleanedIP = cleanIP(ip);
    const userAgentInfo = getUserAgentInfo(userAgent);
    
    // Build source information for incoming requests
    let sourceInfo = '';
    if (requestType.includes('INCOMING') && (referrer || origin)) {
        const source = referrer || origin || 'direct';
        sourceInfo = ` from: ${source}`;
    }
    
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
    
    // Console output with colors (with enhanced user-agent info)
    const logLine = `${color}[${requestId}] ${prefix} [${timestamp}][${clientType}${userAgentInfo}][${cleanedIP}][${requestType}][${statusCode}][${endpoint}]${colors.reset}`;
    console.log(logLine + (additionalInfo ? ` ${colors.dim}${additionalInfo}${colors.reset}` : '') + (sourceInfo ? ` ${colors.dim}${sourceInfo}${colors.reset}` : ''));
    
    // File output without colors (with enhanced user-agent info)
    const fileLogLine = `[${requestId}] [${timestamp}][${clientType}${userAgentInfo}][${cleanedIP}][${requestType}][${statusCode}][${endpoint}]${additionalInfo ? ` ${additionalInfo}` : ''}${sourceInfo}`;
    
    // Write to log file
    try {
        fs.appendFileSync(path.join(logsDir, 'api_logs.log'), fileLogLine + '\n');
    } catch (error) {
        console.error('❌ Fehler beim Schreiben in Log-Datei:', error.message);
    }
    
    return requestId;
}

// Function to log detailed API response (headers + payload)
function logDetailedAPIResponse(response, requestId, clientIP, userAgent, url) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cleanedIP = cleanIP(clientIP);
    
    console.log(`${colors.green}[${requestId}] 📤 OUT [${timestamp}] DETAILED API RESPONSE:${colors.reset}`);
    console.log(`${colors.dim}URL: ${url}${colors.reset}`);
    console.log(`${colors.dim}Status: ${response.status} ${response.statusText}${colors.reset}`);
    
    // Log headers
    console.log(`${colors.cyan}Response Headers:${colors.reset}`);
    Object.entries(response.headers).forEach(([key, value]) => {
        console.log(`${colors.dim}  ${key}: ${value}${colors.reset}`);
    });
    
    // Log payload (formatted)
    console.log(`${colors.cyan}Response Payload:${colors.reset}`);
    try {
        const formattedPayload = JSON.stringify(response.data, null, 2);
        // Truncate if too long for console
        if (formattedPayload.length > 2000) {
            console.log(`${colors.dim}${formattedPayload.substring(0, 2000)}...${colors.reset}`);
            console.log(`${colors.yellow}[Payload truncated - full response: ${formattedPayload.length} characters]${colors.reset}`);
        } else {
            console.log(`${colors.dim}${formattedPayload}${colors.reset}`);
        }
    } catch (e) {
        console.log(`${colors.red}[Could not format payload as JSON]${colors.reset}`);
        console.log(`${colors.dim}${response.data}${colors.reset}`);
    }
    
    // Also write to separate detailed log file
    try {
        const detailedLogData = {
            timestamp: timestamp,
            requestId: requestId,
            clientIP: cleanedIP,
            url: url,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            payload: response.data
        };
        
        const logEntry = `\n=== API RESPONSE ${requestId} at ${timestamp} ===\n` +
                        `URL: ${url}\n` +
                        `Client: ${cleanedIP}\n` +
                        `Status: ${response.status} ${response.statusText}\n` +
                        `Headers: ${JSON.stringify(response.headers, null, 2)}\n` +
                        `Payload: ${JSON.stringify(response.data, null, 2)}\n` +
                        `=== END RESPONSE ${requestId} ===\n`;
        
        fs.appendFileSync(path.join(logsDir, 'api_detailed_responses.log'), logEntry);
    } catch (error) {
        console.error('❌ Fehler beim Schreiben der detaillierten Response-Logs:', error.message);
    }
    
    console.log(`${colors.green}[${requestId}] 📤 OUT [${timestamp}] END DETAILED RESPONSE${colors.reset}\n`);
}

// Middleware to log all incoming requests
app.use((req, res, next) => {
    const clientIP = getRealClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const referrer = req.get('Referer') || req.get('Referrer') || null;
    const origin = req.get('Origin') || null;
    
    // Generate request ID for this request
    const requestId = logAPIRequest(
        clientIP, 
        userAgent, 
        req.originalUrl, 
        '-', 
        'INCOMING_REQUEST', 
        `${req.method} ${req.originalUrl}`,
        null,
        referrer,
        origin
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

// Block WordPress scan requests
app.use((req, res, next) => {
    const wpPatterns = [
        /^\/wp-admin\//,
        /^\/wp-login\.php$/,
        /^\/wp-config\.php$/,
        /^\/wp-content\//,
        /^\/wp-includes\//,
        /^\/xmlrpc\.php$/,
        /^\/wp-cron\.php$/,
        /^\/wp-signup\.php$/,
        /^\/wp-links-opml\.php$/,
        /^\/wp-load\.php$/,
        /^\/wp-trackback\.php$/,
        /^\/readme\.html$/,
        /^\/license\.txt$/
    ];
    if (wpPatterns.some(pattern => pattern.test(req.path))) {
        logAPIRequest(getRealClientIP(req), req.headers['user-agent'], req.originalUrl, 403, 'BLOCKED_WP_SCAN', 'Blocked WordPress scan request', req.requestId);
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Automatischer Scan-Request blockiert.',
            type: 'BLOCKED_WP_SCAN'
        });
    }
    next();
});

// Block sensitive file access attempts
app.use((req, res, next) => {
    const sensitivePatterns = [
        /^\/\.env/,        // .env files
        /^\/config\.php$/,  // PHP config
        /^\/\.git\//,      // Git directory
        /^\/\.htaccess$/,  // Apache config
        /^\/robots\.txt$/,  // Optional: protect robots.txt
        /^\/sitemap\.xml$/  // Optional: protect sitemap
    ];
    
    if (sensitivePatterns.some(pattern => pattern.test(req.path))) {
        logAPIRequest(getRealClientIP(req), req.headers['user-agent'], req.originalUrl, 403, 'BLOCKED_SENSITIVE_FILE', 'Blocked sensitive file access attempt', req.requestId);
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Zugriff auf sensible Dateien blockiert.',
            type: 'BLOCKED_SENSITIVE_FILE'
        });
    }
    next();
});

// Environment variables endpoint (safe for frontend)
app.get('/api/env', (req, res) => {
    const publicVars = {
        DEBUG_MODE: process.env.DEBUG_MODE || 'false',
        ENABLE_USER_AUTH: process.env.ENABLE_USER_AUTH || 'true',
        ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS || 'false'
    };
    
    // EINFACH: Schicke Supabase-Werte wenn sie existieren
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        publicVars.SUPABASE_URL = process.env.SUPABASE_URL;
        publicVars.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
        console.log('✅ Supabase ENV gefunden, sende an Frontend:', {
            url: process.env.SUPABASE_URL.substring(0, 30) + '...',
            key: '[ANON_KEY_GESETZT]'
        });
    } else {
        // Server hat keine Supabase-Werte
        publicVars.SUPABASE_URL = '';
        publicVars.SUPABASE_ANON_KEY = '';
        console.log('⚠️ Keine Supabase ENV gefunden, sende leere Werte');
    }
    
    res.json(publicVars);
});

// Proxy routes for feedback API to handle HTTPS/SSL issues
app.all('/api/feedback*', async (req, res) => {
    const clientIP = getRealClientIP(req);
    
    try {
        // Forward request to feedback API on port 3002
        const feedbackApiUrl = `http://localhost:3002${req.originalUrl}`;
        
        console.log(`${colors.magenta}🔄 PROXY${colors.reset} ${colors.dim}[${new Date().toISOString()}]${colors.reset} ${req.method} ${req.originalUrl} → ${feedbackApiUrl} from ${colors.cyan}${clientIP}${colors.reset}`);
        
        // Forward the request
        const response = await axios({
            method: req.method,
            url: feedbackApiUrl,
            data: req.body,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'User-Agent': req.headers['user-agent'] || 'WartenIsORG-Proxy',
                'Authorization': req.headers['authorization'] || ''
            },
            timeout: 10000,
            validateStatus: () => true // Don't throw on HTTP error status
        });
        
        // Forward response
        res.status(response.status).json(response.data);
        
    } catch (error) {
        console.error(`${colors.red}❌ PROXY ERROR${colors.reset} ${req.originalUrl}:`, error.message);
        
        res.status(503).json({
            error: 'Feedback service unavailable',
            message: 'Die Feedback-API ist momentan nicht erreichbar.',
            type: 'PROXY_ERROR'
        });
    }
});

// Proxy routes for admin API (feedback admin functionality)
app.all('/api/admin*', async (req, res) => {
    const clientIP = getRealClientIP(req);
    
    try {
        // Forward request to feedback API on port 3002
        const feedbackApiUrl = `http://localhost:3002${req.originalUrl}`;
        
        console.log(`${colors.magenta}🔒 ADMIN PROXY${colors.reset} ${colors.dim}[${new Date().toISOString()}]${colors.reset} ${req.method} ${req.originalUrl} → ${feedbackApiUrl} from ${colors.cyan}${clientIP}${colors.reset}`);
        
        // Forward the request
        const response = await axios({
            method: req.method,
            url: feedbackApiUrl,
            data: req.body,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'User-Agent': req.headers['user-agent'] || 'WartenIsORG-Admin-Proxy',
                'Authorization': req.headers['authorization'] || ''
            },
            timeout: 10000,
            validateStatus: () => true // Don't throw on HTTP error status
        });
        
        // Forward response
        res.status(response.status).json(response.data);
        
    } catch (error) {
        console.error(`${colors.red}❌ ADMIN PROXY ERROR${colors.reset} ${req.originalUrl}:`, error.message);
        
        res.status(503).json({
            error: 'Admin service unavailable',
            message: 'Die Admin-API ist momentan nicht erreichbar.',
            type: 'ADMIN_PROXY_ERROR'
        });
    }
});

// API endpoint for departures
app.get('/api/departures/:rbl', async (req, res) => {
    const rbl = req.params.rbl;
    const clientIP = getRealClientIP(req);
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
    const apiUrl = `http://www.wienerlinien.at/ogd_realtime/monitor?rbl=${rbl}&sender=WartenIsORG`;
    
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
        const extRequestId = logAPIRequest(clientIP, userAgent, apiUrl, '-', 'EXTERNAL_REQUEST', 'Calling Wiener Linien API', req.requestId);        const startTime = Date.now();
        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'WartenIsORG/1.0 (Development)'
            }
        });
        const responseTime = Date.now() - startTime;
        
    // Log basic response info (no payload)
    logAPIRequest(clientIP, userAgent, apiUrl, response.status, 'EXTERNAL_RESPONSE', `${responseTime}ms - ${response.headers['content-length'] || JSON.stringify(response.data).length} bytes`, extRequestId);
        
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
            
            // Log detailed error response
            console.log(`${colors.red}[${req.requestId}] 📤 OUT DETAILED ERROR RESPONSE:${colors.reset}`);
            logDetailedAPIResponse(error.response, req.requestId, clientIP, userAgent, apiUrl);
            
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
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        env_loaded: Object.keys(envLoader.getPublicVars()).length,
        supabase_configured: !!envLoader.get('SUPABASE_URL')
    });
});

// API endpoint für Environment-Variablen
app.get('/api/env', (req, res) => {
    const publicVars = envLoader.getPublicVars();
    res.json(publicVars);
});

// SPA Fallback für alle anderen Routen - mit Environment-Variablen injection
app.get('*', (req, res) => {
    try {
        const htmlPath = path.join(__dirname, 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        // Inject Environment-Variablen vor dem schließenden </head> Tag
        const envScript = envLoader.generateJavaScript();
        html = html.replace('</head>', `${envScript}\n</head>`);
        
        res.send(html);
    } catch (error) {
        console.error('Error serving HTML:', error);
        res.status(500).send('Server Error');
    }
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
    console.log(`${colors.bright}${colors.green}🚇 Warten is ORG Server gestartet! (DEV)${colors.reset}`);
    console.log(`${colors.cyan}📱 App verfügbar unter: http://localhost:${PORT}${colors.reset}`);
    console.log(`${colors.cyan}🔌 API verfügbar unter: http://localhost:${PORT}/api/departures/:rbl${colors.reset}`);
    console.log(`${colors.cyan}❤️  Health Check: http://localhost:${PORT}/health${colors.reset}`);
    console.log(`${colors.yellow}📋 Log-Datei: ${path.join(logsDir, 'api_logs.log')}${colors.reset}`);
    console.log(`${colors.cyan}🔧 Environment-Variablen: ${Object.keys(envLoader.getPublicVars()).length} geladen${colors.reset}`);
    console.log(`${colors.cyan}💾 Supabase konfiguriert: ${envLoader.get('SUPABASE_URL') ? '✅' : '❌'}${colors.reset}`);
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
