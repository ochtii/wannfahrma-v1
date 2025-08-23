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
    
    return { url, key };
};

const supabaseConfig = getSupabaseConfig();
const SUPABASE_URL = supabaseConfig.url;
const SUPABASE_ANON_KEY = supabaseConfig.key;

// Check if Supabase configuration is available
const isSupabaseConfigured = () => {
    return SUPABASE_URL && SUPABASE_ANON_KEY;
};

// Initialize Supabase client when available
let supabaseClient = null;

// Try to initialize immediately if Supabase is already loaded
if (typeof window !== 'undefined' && window.supabase && isSupabaseConfigured()) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
}

// Fallback initialization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Re-check configuration after DOM load (in case ENV_VARS were injected)
    const currentConfig = getSupabaseConfig();
    const isConfigured = currentConfig.url && currentConfig.key;
    
    // Check if User Authentication is enabled
    if (window.appConfig && !window.appConfig.isFeatureEnabled('USER_AUTH')) {
        return; // Silent return - keine Log-Ausgabe nötig
    }

    if (!supabaseClient && typeof window.supabase !== 'undefined' && isConfigured) {
        supabaseClient = window.supabase.createClient(currentConfig.url, currentConfig.key);
        window.supabaseClient = supabaseClient;
        console.log('✅ Supabase erfolgreich initialisiert');
    } else if (!isConfigured) {
        // Nur warnen wenn Authentication aktiviert ist oder Config nicht verfügbar
        if (!window.appConfig || window.appConfig.isFeatureEnabled('USER_AUTH')) {
            console.warn('⚠️ Supabase nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_ANON_KEY in .env setzen.');
            console.warn('⚠️ Supabase nicht konfiguriert. Authentication wird deaktiviert.');
        }
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

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
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
        while (!supabaseClient && attempts < 50) {
            if (typeof window.supabase !== 'undefined') {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                window.supabaseClient = supabaseClient;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (supabaseClient) {
            this.supabase = supabaseClient;
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
