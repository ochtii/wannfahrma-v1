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

// Fallback für alle anderen Routen (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Development Server gestartet auf http://localhost:${PORT}`);
    console.log(`🔧 Environment-Variablen: ${Object.keys(envLoader.getPublicVars()).length} geladen`);
    console.log(`💾 Supabase konfiguriert: ${envLoader.get('SUPABASE_URL') ? '✅' : '❌'}`);
});

module.exports = app;
