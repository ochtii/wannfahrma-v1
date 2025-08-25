// Cookie Consent Functions

/**
 * Sets the user's tracking preference and stores it in localStorage and user profile if logged in
 * @param {boolean} allowed - Whether tracking is allowed
 */
WienOPNVApp.prototype.setTrackingPreference = function(allowed) {
    // Store in localStorage
    localStorage.setItem('allowTracking', allowed ? 'true' : 'false');
    
    // If user is logged in, also store in profile
    if (this.auth?.isLoggedIn && this.auth?.user && window.supabaseClient) {
        window.supabaseClient.from('profiles').upsert({
            id: this.auth.user.id,
            tracking_allowed: allowed,
            updated_at: new Date()
        }).then(({ error }) => {
            if (error) console.error('Fehler beim Speichern der Tracking-Einstellungen:', error);
        });
    }
    
    // Hide cookie consent dialog
    const cookieDialog = document.getElementById('cookieConsentDialog');
    if (cookieDialog) cookieDialog.classList.remove('show');
    
    // Show notification
    this.showNotification(
        allowed ? 
        'Tracking aktiviert. Vielen Dank für Ihre Unterstützung!' : 
        'Tracking deaktiviert. Einstellungen wurden gespeichert.', 
        'info'
    );
};

/**
 * Shows cookie consent dialog if user hasn't made a choice yet
 */
WienOPNVApp.prototype.showCookieConsentIfNeeded = function() {
    // Only show if no preference is set
    if (localStorage.getItem('allowTracking') === null) {
        const consentDialog = document.getElementById('cookieConsentDialog');
        
        if (consentDialog) {
            consentDialog.classList.add('show');
            
            // Add event listeners for buttons
            document.getElementById('acceptCookies')?.addEventListener('click', () => {
                this.setTrackingPreference(true);
            });
            
            document.getElementById('declineCookies')?.addEventListener('click', () => {
                this.setTrackingPreference(false);
            });
        }
    }
};

// Initialize the trackingToggle in the settings if it exists
WienOPNVApp.prototype.initializeTrackingToggle = function() {
    const trackingToggle = document.getElementById('trackingToggle');
    if (!trackingToggle) return;
    
    // Set initial state
    trackingToggle.checked = localStorage.getItem('allowTracking') === 'true';
    
    // Add event listener
    trackingToggle.addEventListener('change', () => {
        this.setTrackingPreference(trackingToggle.checked);
    });
};
