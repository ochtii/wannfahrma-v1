// =============================================================================
// Lokaler Development Server für wannfahrma-v1
// =============================================================================
// Minimaler Express-Server für lokale Entwicklung mit .env Support
// =============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// .env Loader
const envLoader = require('./env-loader');

// Static files
app.use(express.static('.'));

// API endpoint für Environment-Variablen
app.get('/api/env', (req, res) => {
    const publicVars = envLoader.getPublicVars();
    res.json(publicVars);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        env_loaded: Object.keys(envLoader.getPublicVars()).length
    });
});

// Fallback für alle anderen Routen (SPA) - mit Environment-Variablen injection
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

app.listen(PORT, () => {
    console.log(`🚀 Development Server gestartet auf http://localhost:${PORT}`);
    console.log(`🔧 Environment-Variablen: ${Object.keys(envLoader.getPublicVars()).length} geladen`);
    console.log(`💾 Supabase konfiguriert: ${envLoader.get('SUPABASE_URL') ? '✅' : '❌'}`);
});

module.exports = app;
