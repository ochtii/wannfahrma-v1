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
        this.loadProcessEnv();
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
    
    // Lädt Werte aus process.env (für server Umgebung)
    loadProcessEnv() {
        // Supabase Werte immer aus process.env laden wenn verfügbar
        if (process.env.SUPABASE_URL) {
            this.env.SUPABASE_URL = process.env.SUPABASE_URL;
        }
        
        if (process.env.SUPABASE_ANON_KEY) {
            this.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
        }
        
        // Andere wichtige Werte überschreiben
        if (process.env.API_BASE_URL) {
            this.env.API_BASE_URL = process.env.API_BASE_URL;
        }
        
        console.log('🔍 Process Env Values loaded:', 
            Object.keys(process.env)
                .filter(key => key === 'SUPABASE_URL' || key === 'SUPABASE_ANON_KEY')
                .map(key => `${key}=${process.env[key] ? '✓' : '✗'}`)
        );
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
