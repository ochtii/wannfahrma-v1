// Supabase Configuration and Authentication Module
// Note: Configure SUPABASE_URL and SUPABASE_ANON_KEY in .env file

// Configuration from environment variables (browser-safe)
const getSupabaseConfig = () => {
    let url = '', key = '';
    
    // 1. Von window.ENV_VARS (moderner Weg)
    if (typeof window !== 'undefined' && window.ENV_VARS) {
        url = window.ENV_VARS.SUPABASE_URL || '';
        key = window.ENV_VARS.SUPABASE_ANON_KEY || '';
    }
    
    // 2. Fallback zu direkten window-Variablen (Backward-Kompatibilität)
    if (!url && typeof window !== 'undefined' && window.SUPABASE_URL) {
        url = window.SUPABASE_URL;
        key = window.SUPABASE_ANON_KEY || '';
    }
    
    // 3. Fallback zu process.env (Server-Kontext)
    if (!url && typeof process !== 'undefined' && process.env) {
        url = process.env.SUPABASE_URL || '';
        key = process.env.SUPABASE_ANON_KEY || '';
    }
    
    // Debug-Ausgabe nur wenn nicht konfiguriert
    if (!url || !key) {
        console.log('🔍 Supabase Config Debug:');
        console.log('  - URL gefunden:', !!url, url ? url.substring(0, 30) + '...' : 'LEER');
        console.log('  - KEY gefunden:', !!key, key ? '[KEY IST GESETZT]' : 'LEER');
        console.log('  - window.ENV_VARS:', window.ENV_VARS ? Object.keys(window.ENV_VARS) : 'NICHT VERFÜGBAR');
        console.log('  - window.ENV_VARS.SUPABASE_URL:', window.ENV_VARS?.SUPABASE_URL ? 'GESETZT' : 'NICHT GESETZT');
        console.log('  - window.ENV_VARS.SUPABASE_ANON_KEY:', window.ENV_VARS?.SUPABASE_ANON_KEY ? 'GESETZT' : 'NICHT GESETZT');
        console.log('  - Aktuelle ENV_VARS Werte:', {
            SUPABASE_URL: window.ENV_VARS?.SUPABASE_URL,
            SUPABASE_ANON_KEY: window.ENV_VARS?.SUPABASE_ANON_KEY ? '[HIDDEN]' : undefined
        });
    } else {
        console.log('✅ Supabase Config gefunden!', { url: url.substring(0, 30) + '...', key: '[GESETZT]' });
    }
    
    return { url, key };
};

// Check if Supabase configuration is available (dynamic check)
const isSupabaseConfigured = () => {
    const config = getSupabaseConfig();
    return config.url && config.key;
};

// Initialize Supabase client when available
let supabaseClient = null;

// Function to wait for environment variables to be loaded
const waitForEnvVars = async (maxAttempts = 50) => {
    for (let i = 0; i < maxAttempts; i++) {
        if (window.ENV_VARS?.SUPABASE_URL && window.ENV_VARS?.SUPABASE_ANON_KEY) {
            console.log('✅ Environment-Variablen erfolgreich geladen nach', i + 1, 'Versuchen');
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('⚠️ Environment-Variablen nach', maxAttempts, 'Versuchen nicht geladen');
    return false;
};

// Function to initialize Supabase with current config
const initializeSupabase = async () => {
    if (supabaseClient) return supabaseClient; // Already initialized
    
    // Wait for environment variables to be loaded
    const envLoaded = await waitForEnvVars();
    if (!envLoaded) {
        console.log('⚠️ Environment-Variablen nicht verfügbar, verwende fallback');
    }
    
    const config = getSupabaseConfig();
    if (typeof window !== 'undefined' && window.supabase && config.url && config.key) {
        supabaseClient = window.supabase.createClient(config.url, config.key);
        window.supabaseClient = supabaseClient;
        console.log('✅ Supabase erfolgreich initialisiert');
        return supabaseClient;
    }
    return null;
};

// Try to initialize immediately if Supabase is already loaded (async)
if (typeof window !== 'undefined' && window.supabase) {
    initializeSupabase().then(client => {
        if (client) console.log('🚀 Supabase sofort initialisiert');
    });
}

// Fallback initialization when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if User Authentication is enabled
    if (window.appConfig && !window.appConfig.isFeatureEnabled('USER_AUTH')) {
        return; // Silent return - keine Log-Ausgabe nötig
    }

    // Try to initialize Supabase (with waiting for env vars)
    const client = await initializeSupabase();
    
    if (!client && (!window.appConfig || window.appConfig.isFeatureEnabled('USER_AUTH'))) {
        // Nur warnen wenn Authentication aktiviert ist
        console.warn('⚠️ Supabase Konfiguration nicht gefunden. Authentication wird deaktiviert.');
        console.info('💡 Setzen Sie SUPABASE_URL und SUPABASE_ANON_KEY in der .env Datei.');
    }
});

// Authentication class
class Auth {
    constructor() {
        this.user = null;
        this.isLoggedIn = false;
        this.supabase = null;
        this.initialize();
    }

    async initialize() {
        // Kurz warten um sicherzustellen dass CONFIG verfügbar ist
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if User Authentication is enabled
        if (window.CONFIG && !window.CONFIG.isFeatureEnabled('USER_AUTH')) {
            console.info('ℹ️ User Authentication ist deaktiviert (ENABLE_USER_AUTH=false)');
            return;
        }

        // Try to initialize Supabase (with waiting for env vars)
        this.supabase = await initializeSupabase();
        
        if (!this.supabase) {
            // Nur warnen wenn Authentication aktiviert ist
            if (!window.CONFIG || window.CONFIG.isFeatureEnabled('USER_AUTH')) {
                console.warn('⚠️ Supabase nicht konfiguriert. Authentication wird deaktiviert.');
                console.info('💡 Setzen Sie SUPABASE_URL und SUPABASE_ANON_KEY in .env um Supabase zu aktivieren.');
            } else {
                console.info('ℹ️ Supabase nicht konfiguriert - Authentication ist deaktiviert');
            }
            return;
        }

        // Wait for Supabase to be available
        let attempts = 0;
        while (!this.supabase && attempts < 10) {
            if (typeof window.supabase !== 'undefined') {
                this.supabase = await initializeSupabase();
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (this.supabase) {
            // Bereits initialisiert
        } else {
            console.warn('Supabase nicht verfügbar. Authentication wird deaktiviert.');
            return;
        }

        // Get initial session
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.user = session.user;
            this.isLoggedIn = true;
            this.onAuthStateChange(true, this.user);
        }

        // Listen for auth changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.user = session.user;
                this.isLoggedIn = true;
                this.onAuthStateChange(true, this.user);
            } else {
                this.user = null;
                this.isLoggedIn = false;
                this.onAuthStateChange(false, null);
            }
        });
    }

    async register(email, password, userData = {}) {
        if (!this.supabase) {
            return { success: false, message: 'Supabase nicht verfügbar.' };
        }
        
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            });

            if (error) throw error;

            // After successful registration, optionally migrate local storage data
            if (data.user && !data.session) {
                // User needs to confirm email first
                return { 
                    success: true, 
                    message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.',
                    needsEmailConfirmation: true,
                    user: data.user
                };
            }

            return { 
                success: true, 
                message: 'Registrierung erfolgreich!',
                user: data.user
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    async login(email, password) {
        if (!this.supabase) {
            return { success: false, message: 'Supabase nicht verfügbar.' };
        }
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            return { 
                success: true, 
                message: 'Anmeldung erfolgreich!',
                user: data.user
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    async logout() {
        if (!this.supabase) {
            return { success: false, message: 'Supabase nicht verfügbar.' };
        }
        
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            return { 
                success: true, 
                message: 'Abmeldung erfolgreich!' 
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    async resetPassword(email) {
        if (!this.supabase) {
            return { success: false, message: 'Supabase nicht verfügbar.' };
        }
        
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;

            return { 
                success: true, 
                message: 'Password-Reset E-Mail gesendet!' 
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    // Override this method in your app to handle auth state changes
    onAuthStateChange(isLoggedIn, user) {
        // This will be overridden by the main app
        console.log('Auth state changed:', isLoggedIn, user);
    }

    // Check usage limits for non-authenticated users
    checkUsageLimits() {
        if (this.isLoggedIn) {
            return { withinLimits: true }; // No limits for authenticated users
        }

        // Check local storage limits for non-authenticated users
        const cards = JSON.parse(localStorage.getItem('dashboardCards') || '[]');
        
        if (cards.length >= 1) {
            return { 
                withinLimits: false, 
                reason: 'Ohne Anmeldung ist nur 1 Dashboard-Karte erlaubt. Bitte registrieren Sie sich für unbegrenzte Karten.' 
            };
        }

        // Check if any card has more than 5 lines
        for (const card of cards) {
            if (card.departureLines && card.departureLines.length >= 5) {
                return { 
                    withinLimits: false, 
                    reason: 'Ohne Anmeldung sind maximal 5 Abfahrtslinien pro Karte erlaubt. Bitte registrieren Sie sich für unbegrenzte Linien.' 
                };
            }
        }

        return { withinLimits: true };
    }
}

// User Data Management
class UserDataManager {
    constructor(auth) {
        this.auth = auth;
    }

    get supabase() {
        return this.auth.supabase;
    }

    // Migrate local storage data to user account
    async migrateLocalStorageData() {
        if (!this.auth.isLoggedIn) {
            throw new Error('User must be logged in to migrate data');
        }

        if (!this.supabase) {
            return { success: false, message: 'Supabase nicht verfügbar.' };
        }

        try {
            // Get local storage data
            const localCards = JSON.parse(localStorage.getItem('wien_opnv_dashboard_cards') || '[]');
            const localSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');

            if (localCards.length === 0 && Object.keys(localSettings).length === 0) {
                return { success: true, message: 'Keine lokalen Daten zum Migrieren gefunden.' };
            }

            // Save to Supabase - convert localStorage format to database format
            const { error: cardsError } = await this.supabase
                .from('user_dashboard_cards')
                .upsert(localCards.map(card => ({
                    user_id: this.auth.user.id,
                    card_id: card.id,
                    title: card.title,
                    station_name: card.stationName,
                    station: card.station,
                    rbls: card.rblNumbers || card.rbls || [],
                    departure_lines: card.departureLines || [],
                    auto_refresh: card.autoRefresh || false,
                    refresh_interval: card.refreshInterval || 30,
                    auto_sort: card.autoSort !== false, // default to true
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })));

            if (cardsError) throw cardsError;

            if (Object.keys(localSettings).length > 0) {
                const { error: settingsError } = await this.supabase
                    .from('user_settings')
                    .upsert({
                        user_id: this.auth.user.id,
                        settings: localSettings,
                        updated_at: new Date().toISOString()
                    });

                if (settingsError) throw settingsError;
            }

            // Clear local storage after successful migration
            localStorage.removeItem('wien_opnv_dashboard_cards');
            localStorage.removeItem('appSettings');

            return { 
                success: true, 
                message: `${localCards.length} Karten und Einstellungen erfolgreich übertragen!` 
            };
        } catch (error) {
            return { 
                success: false, 
                message: `Fehler bei der Datenübertragung: ${error.message}` 
            };
        }
    }

    // Load user dashboard cards from Supabase
    async loadUserDashboardCards() {
        if (!this.auth.isLoggedIn || !this.supabase) {
            return [];
        }

        try {
            const { data, error } = await this.supabase
                .from('user_dashboard_cards')
                .select('*')
                .eq('user_id', this.auth.user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Convert database format back to localStorage format
            const convertedCards = (data || []).map(dbCard => ({
                id: dbCard.card_id,
                title: dbCard.title,
                stationName: dbCard.station_name,
                station: dbCard.station,
                rblNumbers: dbCard.rbls || [],
                departureLines: dbCard.departure_lines || [],
                autoRefresh: dbCard.auto_refresh || false,
                refreshInterval: dbCard.refresh_interval || 30,
                autoSort: dbCard.auto_sort !== false, // default to true
                // Include any additional fields from the database
                latitude: dbCard.latitude,
                longitude: dbCard.longitude,
                size: dbCard.size,
                position: dbCard.position
            }));

            return convertedCards;
        } catch (error) {
            console.error('Error loading user dashboard cards:', error);
            return [];
        }
    }

    // Save user dashboard cards to Supabase
    async saveUserDashboardCards(cards) {
        if (!this.auth.isLoggedIn) {
            throw new Error('User must be logged in to save data');
        }

        if (!this.supabase) {
            return { success: false, message: 'Supabase nicht verfügbar.' };
        }

        try {
            // Delete existing cards for this user
            await this.supabase
                .from('user_dashboard_cards')
                .delete()
                .eq('user_id', this.auth.user.id);

            // Insert new cards - convert localStorage format to database format
            if (cards.length > 0) {
                const { error } = await this.supabase
                    .from('user_dashboard_cards')
                    .insert(cards.map(card => ({
                        user_id: this.auth.user.id,
                        card_id: card.id,
                        title: card.title,
                        station_name: card.stationName,
                        station: card.station,
                        rbls: card.rblNumbers || card.rbls || [],
                        departure_lines: card.departureLines || [],
                        auto_refresh: card.autoRefresh || false,
                        refresh_interval: card.refreshInterval || 30,
                        auto_sort: card.autoSort !== false, // default to true
                        updated_at: new Date().toISOString()
                    })));

                if (error) throw error;
            }

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: `Fehler beim Speichern: ${error.message}` 
            };
        }
    }

    // Load user settings from Supabase
    async loadUserSettings() {
        if (!this.auth.isLoggedIn || !this.supabase) {
            return {};
        }

        try {
            const { data, error } = await this.supabase
                .from('user_settings')
                .select('settings')
                .eq('user_id', this.auth.user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No settings found, return empty object
                    return {};
                }
                throw error;
            }

            return data?.settings || {};
        } catch (error) {
            console.error('Error loading user settings:', error);
            return {};
        }
    }

    // Save user settings to Supabase
    async saveUserSettings(settings) {
        if (!this.auth.isLoggedIn) {
            throw new Error('User must be logged in to save settings');
        }

        if (!this.supabase) {
            return { success: false, message: 'Supabase nicht verfügbar.' };
        }

        try {
            const { error } = await this.supabase
                .from('user_settings')
                .upsert({
                    user_id: this.auth.user.id,
                    settings,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: `Fehler beim Speichern der Einstellungen: ${error.message}` 
            };
        }
    }
}

// Make classes available globally
window.Auth = Auth;
window.UserDataManager = UserDataManager;
