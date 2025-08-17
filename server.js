const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// API proxy for Wiener Linien
app.get('/api/departures/:rbl', async (req, res) => {
    try {
        const rbl = req.params.rbl;
        const apiUrl = `https://www.wienerlinien.at/ogd_realtime/monitor?rbl=${rbl}&sender=your-app-key`;
        
        console.log(`Fetching departures for RBL ${rbl}...`);
        
        const response = await axios.get(apiUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'WannFahrmaOIDA/1.0.0'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error(`Error fetching data for RBL ${req.params.rbl}:`, error.message);
        res.status(500).json({ 
            error: 'Failed to fetch departure data',
            message: error.message 
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
