// =============================================================================
// Application Initialization Manager
// =============================================================================
// Koordiniert das Laden von Environment-Variablen, Config und anderen Services
// =============================================================================

class AppInitializer {
    constructor() {
        this.steps = {
            environment: false,
            config: false,
            dom: false
        };
        this.callbacks = [];
        
        this.initializeEnvironment();
        this.setupDOMListener();
    }
    
    async initializeEnvironment() {
        try {
            // Prüfe ob Environment-Variablen bereits gesetzt sind
            if (!window.ENV_VARS || Object.keys(window.ENV_VARS).length === 0) {
                window.ENV_VARS = {};
                
                // Versuche vom Server zu laden
                try {
                    const response = await fetch('/api/env');
                    if (response.ok) {
                        const envVars = await response.json();
                        window.ENV_VARS = envVars;
                        console.log('🔧 Environment-Variablen geladen:', Object.keys(envVars));
                    }
                } catch (error) {
                    console.warn('⚠️ Konnte Environment-Variablen nicht laden, nutze Fallback');
                }
                
                // Fallback-Werte setzen
                if (Object.keys(window.ENV_VARS).length === 0) {
                    const isLocal = window.location.hostname === 'localhost' || 
                                   window.location.hostname === '127.0.0.1';
                    
                    window.ENV_VARS = {
                        DEBUG_MODE: isLocal ? 'true' : 'false',
                        ENABLE_USER_AUTH: isLocal ? 'false' : 'true',
                        ENABLE_ANALYTICS: 'false'
                    };
                    console.log('🔧 Fallback Environment-Variablen gesetzt');
                }
            }
            
            this.steps.environment = true;
            this.checkInitialization();
            
        } catch (error) {
            console.error('❌ Fehler bei Environment-Initialisierung:', error);
            this.steps.environment = true; // Trotzdem fortfahren
            this.checkInitialization();
        }
    }
    
    setupDOMListener() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.steps.dom = true;
                this.checkInitialization();
            });
        } else {
            this.steps.dom = true;
            this.checkInitialization();
        }
    }
    
    initializeConfig() {
        if (typeof window.loadConfig === 'function') {
            window.loadConfig();
            this.steps.config = true;
            console.log('🔧 App-Konfiguration initialisiert');
        }
        this.checkInitialization();
    }
    
    checkInitialization() {
        if (this.steps.environment && this.steps.dom && !this.steps.config) {
            // Kurze Verzögerung für saubere Initialisierung
            setTimeout(() => {
                this.initializeConfig();
            }, 50);
        }
        
        if (this.steps.environment && this.steps.config && this.steps.dom) {
            console.log('✅ App-Initialisierung abgeschlossen');
            this.executeCallbacks();
        }
    }
    
    onReady(callback) {
        if (this.isReady()) {
            callback();
        } else {
            this.callbacks.push(callback);
        }
    }
    
    isReady() {
        return this.steps.environment && this.steps.config && this.steps.dom;
    }
    
    executeCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('❌ Fehler bei Callback-Ausführung:', error);
            }
        });
        this.callbacks = [];
    }
}

// Globale Instanz erstellen
window.appInitializer = new AppInitializer();
