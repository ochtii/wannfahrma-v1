// NEUE SUPABASE KONFIGURATION - KOMPLETT NEU GESCHRIEBEN
// Einfach, robust, funktioniert IMMER

console.log('🔧 Supabase Config wird geladen...');

// Globaler Supabase Client
window.supabaseClient = null;
window.supabaseReady = false;

// EINFACHE Funktion um Supabase Config zu holen
function getSupabaseCredentials() {
    // ALLE möglichen Quellen prüfen
    let url = null;
    let key = null;
    
    // 1. window.ENV_VARS (Server injection)
    if (window.ENV_VARS?.SUPABASE_URL) {
        url = window.ENV_VARS.SUPABASE_URL;
        key = window.ENV_VARS.SUPABASE_ANON_KEY;
        console.log('✅ Supabase Config aus window.ENV_VARS gefunden');
    }
    
    // 2. Direkte window Variablen
    if (!url && window.SUPABASE_URL) {
        url = window.SUPABASE_URL;
        key = window.SUPABASE_ANON_KEY;
        console.log('✅ Supabase Config aus window Variablen gefunden');
    }
    
    // 3. process.env (falls verfügbar)
    if (!url && typeof process !== 'undefined' && process.env?.SUPABASE_URL) {
        url = process.env.SUPABASE_URL;
        key = process.env.SUPABASE_ANON_KEY;
        console.log('✅ Supabase Config aus process.env gefunden');
    }
    
    // 4. TEMPORÄRER FALLBACK - DIREKTE WERTE (bis Server-Problem gelöst ist)
    if (!url || !key) {
        url = 'https://wjzfcanojeauhjpgaydg.supabase.co';
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqemZjYW5vamVhdWhqcGdheWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mzk0MjEsImV4cCI6MjA3MTAxNTQyMX0.MB6FuLQ4ECESPgahc4sBcaoQv23zahlTehIVbEtcyzs';
        console.log('🚨 FALLBACK: Verwende direkte Supabase-Werte (Server-Problem umgehen)');
    }
    
    // 5. DEBUG: ALLE verfügbaren Sources anzeigen
    const debugInfo = {
        hasUrl: !!url,
        hasKey: !!key,
        urlStart: url ? url.substring(0, 30) + '...' : 'NICHT GEFUNDEN',
        sources: {
            ENV_VARS: !!window.ENV_VARS?.SUPABASE_URL,
            ENV_VARS_content: window.ENV_VARS,
            window: !!window.SUPABASE_URL,
            process: !!(typeof process !== 'undefined' && process.env?.SUPABASE_URL),
            fallback: true
        }
    };
    
    console.log('🔍 Supabase Status:', debugInfo);
    
    return { url, key };
}

// Funktion um Supabase zu initialisieren
function initSupabase() {
    if (window.supabaseClient) {
        console.log('✅ Supabase bereits initialisiert');
        return window.supabaseClient;
    }
    
    const { url, key } = getSupabaseCredentials();
    
    if (!url || !key) {
        console.log('⚠️ Supabase Credentials nicht verfügbar');
        return null;
    }
    
    if (!window.supabase) {
        console.log('⚠️ Supabase Library nicht geladen');
        return null;
    }
    
    try {
        window.supabaseClient = window.supabase.createClient(url, key);
        window.supabaseReady = true;
        console.log('🎉 SUPABASE ERFOLGREICH INITIALISIERT!');
        
        // Event für andere Module
        window.dispatchEvent(new CustomEvent('supabaseReady', { 
            detail: { client: window.supabaseClient } 
        }));
        
        return window.supabaseClient;
    } catch (error) {
        console.error('❌ Fehler beim Initialisieren von Supabase:', error);
        return null;
    }
}

// RETRY-Mechanismus - versucht mehrmals Supabase zu initialisieren
let retryCount = 0;
const maxRetries = 50;

function tryInitSupabase() {
    if (window.supabaseReady) return;
    
    const client = initSupabase();
    
    if (!client && retryCount < maxRetries) {
        retryCount++;
        console.log(`🔄 Supabase Retry ${retryCount}/${maxRetries}`);
        setTimeout(tryInitSupabase, 200);
    } else if (!client) {
        console.log('❌ Supabase konnte nach', maxRetries, 'Versuchen nicht initialisiert werden');
        console.log('💡 Prüfen Sie die Environment-Variablen SUPABASE_URL und SUPABASE_ANON_KEY');
    }
}

// SOFORT versuchen
tryInitSupabase();

// Event Listener für Environment-Variablen Updates
window.addEventListener('envVarsUpdated', () => {
    console.log('🔔 Environment-Variablen wurden aktualisiert - versuche Supabase Init');
    tryInitSupabase();
});

// Auch bei DOM Ready versuchen
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Ready - versuche Supabase Init');
    tryInitSupabase();
});

// Auch nach kurzer Verzögerung versuchen (für Environment-Variablen die später geladen werden)
setTimeout(() => {
    console.log('⏰ Delayed Init - versuche Supabase Init');
    tryInitSupabase();
}, 1000);

// NEUE AUTH KLASSE - EINFACH UND ROBUST
class SimpleAuth {
    constructor() {
        this.user = null;
        this.isLoggedIn = false;
        this.callbacks = [];
        
        // Warten auf Supabase
        if (window.supabaseReady) {
            this.init();
        } else {
            window.addEventListener('supabaseReady', () => this.init());
        }
    }
    
    async init() {
        if (!window.supabaseClient) {
            console.log('⚠️ SimpleAuth: Supabase Client nicht verfügbar');
            return;
        }
        
        console.log('🔐 SimpleAuth wird initialisiert...');
        
        try {
            // Session laden
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session?.user) {
                this.user = session.user;
                this.isLoggedIn = true;
                console.log('✅ User bereits eingeloggt:', this.user.email);
            }
            
            // Auth State Changes abhören
            window.supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('🔄 Auth State Change:', event);
                
                if (session?.user) {
                    this.user = session.user;
                    this.isLoggedIn = true;
                } else {
                    this.user = null;
                    this.isLoggedIn = false;
                }
                
                // Callbacks ausführen
                this.callbacks.forEach(callback => callback(this.isLoggedIn, this.user));
            });
            
            // Handle URL hash for email confirmation and password reset
            this.handleAuthCallback();
            
            console.log('✅ SimpleAuth erfolgreich initialisiert');
        } catch (error) {
            console.error('❌ Fehler bei SimpleAuth Init:', error);
        }
    }
    
    handleAuthCallback() {
        const hash = window.location.hash;
        console.log('🔍 Checking URL hash for auth callback:', hash);
        
        if (hash.includes('#/auth/callback')) {
            console.log('✅ Email confirmation detected - cleaning URL');
            // Remove the hash to clean up the URL
            window.history.replaceState(null, null, window.location.pathname);
        } else if (hash.includes('#/auth/reset-password')) {
            console.log('🔐 Password reset detected - cleaning URL');
            // Remove the hash to clean up the URL
            window.history.replaceState(null, null, window.location.pathname);
        }
    }
    
    onAuthChange(callback) {
        this.callbacks.push(callback);
    }
    
    async login(email, password) {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }
        
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return { success: true, user: data.user, message: 'Anmeldung erfolgreich!' };
        } catch (error) {
            return { success: false, error: error.message, message: error.message };
        }
    }
    
    async register(email, password, userData = {}) {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase nicht verfügbar', message: 'Supabase nicht verfügbar' };
        }
        
        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: userData,
                    emailRedirectTo: 'https://wartenis.org/#/auth/callback' // Spezifische Auth-Callback URL
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
                error: error.message,
                message: error.message 
            };
        }
    }
    
    async resetPassword(email) {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase nicht verfügbar', message: 'Supabase nicht verfügbar' };
        }
        
        try {
            const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://wartenis.org/#/auth/reset-password' // Spezifische Password-Reset URL
            });
            if (error) throw error;

            return { 
                success: true, 
                message: 'Password-Reset E-Mail gesendet!' 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                message: error.message 
            };
        }
    }
    
    async logout() {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase nicht verfügbar' };
        }
        
        try {
            const { error } = await window.supabaseClient.auth.signOut();
            if (error) throw error;
            return { success: true, message: 'Abmeldung erfolgreich!' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Global verfügbar machen
window.SimpleAuth = SimpleAuth;
window.getSupabaseCredentials = getSupabaseCredentials;
window.initSupabase = initSupabase;

console.log('📦 Neue Supabase Config geladen');
