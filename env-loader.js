// =============================================================================
// Environment Variables Server
// =============================================================================
// Lädt .env Datei und macht sichere Variablen für Frontend verfügbar
// =============================================================================

const fs = require('fs');
const path = require('path');

class EnvLoader {
    constructor() {
        this.env = {};
        this.loadEnvFile();
    }

    loadEnvFile() {
        const envPath = path.join(__dirname, '.env');
        
        if (!fs.existsSync(envPath)) {
            console.warn('⚠️ .env Datei nicht gefunden');
            return;
        }

        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    const value = valueParts.join('=').trim();
                    this.env[key.trim()] = value;
                }
            }

            console.log('✅ Environment-Variablen geladen:', Object.keys(this.env).length);
        } catch (error) {
            console.error('❌ Fehler beim Laden der .env Datei:', error.message);
        }
    }

    // Nur sichere (public) Variablen für Frontend
    getPublicVars() {
        const publicVars = {};
        
        // Sichere Variablen die im Frontend verwendet werden können
        const safeKeys = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'API_BASE_URL',
            'DEBUG_MODE',
            'ENABLE_USER_AUTH',
            'ENABLE_ANALYTICS'
        ];

        for (const key of safeKeys) {
            if (this.env[key]) {
                publicVars[key] = this.env[key];
            }
        }

        return publicVars;
    }

    get(key) {
        return this.env[key] || process.env[key];
    }

    // Generiere JavaScript für HTML injection
    generateJavaScript() {
        const publicVars = this.getPublicVars();
        return `
            <script>
                window.ENV_VARS = ${JSON.stringify(publicVars, null, 2)};
                console.log('🔧 Environment-Variablen geladen:', Object.keys(window.ENV_VARS));
            </script>
        `;
    }
}

module.exports = new EnvLoader();
