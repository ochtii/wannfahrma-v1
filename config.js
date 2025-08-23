// =============================================================================
// Frontend Configuration Loader
// =============================================================================
// Lädt Konfiguration aus verschiedenen Quellen für Frontend-Verwendung
// =============================================================================

/**
 * Lädt Konfigurationswerte in dieser Reihenfolge:
 * 1. window.ENV_VARS (vom Server injiziert)
 * 2. process.env (für Node.js/Build-Tools)
 * 3. localStorage (für entwickelte Override)
 * 4. Fallback-Werte
 */
class ConfigLoader {
    constructor() {
        this.config = {};
        this.loadConfig();
    }

    loadConfig() {
        // Lade Basis-Konfiguration
        this.config = {
            // Server Konfiguration
            API_BASE_URL: this.getConfigValue('API_BASE_URL', 'https://www.wienerlinien.at/ogd_realtime'),
            API_TIMEOUT: parseInt(this.getConfigValue('API_TIMEOUT', '10000')),
            
            // Supabase Konfiguration (optional)
            SUPABASE_URL: this.getConfigValue('SUPABASE_URL', ''),
            SUPABASE_ANON_KEY: this.getConfigValue('SUPABASE_ANON_KEY', ''),
            
            // Rate Limiting
            RATE_LIMIT_WINDOW: parseInt(this.getConfigValue('RATE_LIMIT_WINDOW', '900000')),
            RATE_LIMIT_MAX_REQUESTS: parseInt(this.getConfigValue('RATE_LIMIT_MAX_REQUESTS', '100')),
            
            // Feature Flags
            ENABLE_USER_AUTH: this.getConfigValue('ENABLE_USER_AUTH', 'true') === 'true',
            ENABLE_ANALYTICS: this.getConfigValue('ENABLE_ANALYTICS', 'false') === 'true',
            
            // Debug
            DEBUG_MODE: this.getConfigValue('DEBUG_MODE', 'false') === 'true',
            LOG_LEVEL: this.getConfigValue('LOG_LEVEL', 'info'),
        };

        // Validiere kritische Konfiguration
        this.validateConfig();
    }

    getConfigValue(key, fallback = '') {
        // 1. Window-injizierte Variablen (vom Server)
        if (typeof window !== 'undefined' && window.ENV_VARS && window.ENV_VARS[key]) {
            return window.ENV_VARS[key];
        }

        // 2. Process Environment (Build-Zeit)
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }

        // 3. LocalStorage Override (Entwicklung)
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(`CONFIG_${key}`);
            if (stored) {
                return stored;
            }
        }

        // 4. Fallback
        return fallback;
    }

    validateConfig() {
        // Warn wenn Supabase konfiguriert ist aber unvollständig
        const hasSupabaseUrl = this.config.SUPABASE_URL;
        const hasSupabaseKey = this.config.SUPABASE_ANON_KEY;
        
        if ((hasSupabaseUrl && !hasSupabaseKey) || (!hasSupabaseUrl && hasSupabaseKey)) {
            console.warn('⚠️ Unvollständige Supabase-Konfiguration. Beide SUPABASE_URL und SUPABASE_ANON_KEY sind erforderlich.');
        }

        if (hasSupabaseUrl && hasSupabaseKey) {
            console.info('✅ Supabase konfiguriert - User Authentication verfügbar');
        } else {
            console.info('ℹ️ Supabase nicht konfiguriert - App läuft im lokalen Modus');
        }

        // Debug-Ausgabe
        if (this.config.DEBUG_MODE) {
            console.group('🔧 App-Konfiguration:');
            Object.entries(this.config).forEach(([key, value]) => {
                // Verstecke sensible Werte
                const sensitiveKeys = ['SUPABASE_ANON_KEY', 'API_KEY'];
                const displayValue = sensitiveKeys.some(sk => key.includes(sk)) 
                    ? '***' + String(value).slice(-4)
                    : value;
                console.log(`${key}:`, displayValue);
            });
            console.groupEnd();
        }
    }

    // Sichere Methode um Supabase-Konfiguration zu erhalten
    getSupabaseConfig() {
        if (!this.config.SUPABASE_URL || !this.config.SUPABASE_ANON_KEY) {
            return null;
        }

        return {
            url: this.config.SUPABASE_URL,
            anonKey: this.config.SUPABASE_ANON_KEY
        };
    }

    // Prüft ob ein Feature aktiviert ist
    isFeatureEnabled(feature) {
        return this.config[`ENABLE_${feature.toUpperCase()}`] === true;
    }

    // Entwickler-Funktionen für Konfiguration Override
    setConfigOverride(key, value) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`CONFIG_${key}`, value);
            console.info(`🔧 Konfiguration überschrieben: ${key} = ${value}`);
            this.loadConfig(); // Neu laden
        }
    }

    clearConfigOverrides() {
        if (typeof localStorage !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('CONFIG_')) {
                    localStorage.removeItem(key);
                }
            });
            console.info('🔧 Alle Konfiguration-Overrides gelöscht');
            this.loadConfig(); // Neu laden
        }
    }
}

// Globale Konfiguration erstellen
const appConfig = new ConfigLoader();

// Für Backward-Kompatibilität - Werte direkt verfügbar machen
if (typeof window !== 'undefined') {
    const supabaseConfig = appConfig.getSupabaseConfig();
    if (supabaseConfig) {
        window.SUPABASE_URL = supabaseConfig.url;
        window.SUPABASE_ANON_KEY = supabaseConfig.anonKey;
    }
    
    // Config-Objekt global verfügbar machen
    window.appConfig = appConfig;
    window.CONFIG = appConfig; // Alias für einfacheren Zugriff
}

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = appConfig;
}
