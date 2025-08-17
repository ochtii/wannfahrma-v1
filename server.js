const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting and caching
const cache = new Map();
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 Minute
const MAX_REQUESTS_PER_WINDOW = 50; // Erhöht von 10 auf 50
const CACHE_TTL = 60000; // Verlängert von 30s auf 60s

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Rate limiting helper
function isRateLimited(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, []);
    }
    
    const requests = rateLimit.get(ip).filter(time => time > windowStart);
    rateLimit.set(ip, requests);
    
    if (requests.length >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }
    
    requests.push(now);
    return false;
}

// Cache helper
function getCachedData(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    cache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

// API proxy for Wiener Linien
app.get('/api/departures/:rbl', async (req, res) => {
    try {
        const rbl = req.params.rbl;
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const cacheKey = `departures_${rbl}`;
        
        // Validierung der RBL
        if (!rbl || isNaN(parseFloat(rbl))) {
            return res.status(400).json({
                error: 'Ungültige RBL-Nummer',
                message: 'RBL muss eine gültige Zahl sein',
                type: 'VALIDATION_ERROR'
            });
        }
        
        // Check cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            console.log(`✓ Cache hit for RBL ${rbl}`);
            return res.json(cachedData);
        }
        
        // Check rate limit
        if (isRateLimited(clientIP)) {
            console.log(`⚠️ Rate limit exceeded for IP ${clientIP}`);
            return res.status(429).json({ 
                error: 'Rate Limit erreicht',
                message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
                type: 'RATE_LIMIT_ERROR',
                retryAfter: 60 
            });
        }
        
        console.log(`🚇 Lade Abfahrten für RBL: ${rbl}`);
        
        // Wiener Linien OGD API
        const apiUrl = `https://www.wienerlinien.at/ogd_realtime/monitor`;
        const response = await axios.get(apiUrl, {
            params: {
                rbl: rbl,
                sender: process.env.WL_API_KEY || 'wann-fahrma-oida'
            },
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
                'Referer': 'https://www.wienerlinien.at/'
            }
        });

        // API-spezifische Fehlerbehandlung
        if (response.data && response.data.message) {
            const { messageCode, value } = response.data.message;
            
            // Rate Limit erreicht (Code 316)
            if (messageCode === 316) {
                return res.status(429).json({
                    error: 'Rate Limit erreicht',
                    message: 'Zu viele Anfragen an die Wiener Linien API. Bitte versuchen Sie es später erneut.',
                    type: 'API_RATE_LIMIT',
                    retryAfter: 60
                });
            }
            
            // Andere API-Fehler
            if (messageCode !== 1) {
                return res.status(400).json({
                    error: 'API-Fehler',
                    message: value || 'Unbekannter API-Fehler',
                    type: 'API_ERROR',
                    code: messageCode
                });
            }
        }
        
        // Cache successful response
        setCachedData(cacheKey, response.data);
        console.log(`✅ Abfahrten geladen und gecacht für RBL: ${rbl}`);
        
        res.json(response.data);
        
    } catch (error) {
        console.error(`❌ Fehler beim Laden der Abfahrten für RBL ${req.params.rbl}:`, error.message);
        
        // Verschiedene Fehlertypen unterscheiden
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Die Wiener Linien API ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.',
                type: 'CONNECTION_ERROR'
            });
        }
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(504).json({
                error: 'Zeitüberschreitung',
                message: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
                type: 'TIMEOUT_ERROR'
            });
        }
        
        // HTTP-Fehler von der API
        if (error.response) {
            const status = error.response.status;
            const apiData = error.response.data;
            
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
        
        // Allgemeiner Fehler
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
        status: 'OK', 
        timestamp: new Date().toISOString(),
        app: 'wann fahrma OIDA'
    });
});

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404s
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log('🚇 wann fahrma OIDA Server gestartet!');
    console.log(`📱 App verfügbar unter: http://localhost:${PORT}`);
    console.log(`🔌 API verfügbar unter: http://localhost:${PORT}/api/departures/:rbl`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('Zum Stoppen: Ctrl+C');
});

module.exports = app;
