// Authentication will be available from supabase-config.js

class WienOPNVApp {
    constructor() {
        this.stations = [];
        this.linesData = [];
        this.selectedStation = null;
        this.currentRBLs = [];
        this.favorites = [];
        this.currentPage = 'search';
        this.settings = {
            darkMode: true
        };
        
        // Initialize authentication (with fallback)
        this.initializeAuth();
        
        this.initializeApp();
    }

    async initializeAuth() {
        // Wait for Auth classes to be available
        let attempts = 0;
        while (!window.Auth && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }
        
        if (window.Auth && window.UserDataManager) {
            this.auth = new window.Auth();
            this.userDataManager = new window.UserDataManager(this.auth);
            console.log('✅ Authentication system initialized');
        } else {
            console.warn('⚠️ Authentication classes not available - running in local-only mode');
            // Create a fallback auth object
            this.auth = {
                isLoggedIn: false,
                user: null,
                checkUsageLimits: () => {
                    const cards = JSON.parse(localStorage.getItem('wien_opnv_dashboard_cards') || '[]');
                    if (cards.length >= 1) {
                        return { 
                            withinLimits: false, 
                            reason: 'Ohne Anmeldung ist nur 1 Dashboard-Karte erlaubt. Bitte registrieren Sie sich für unbegrenzte Karten.' 
                        };
                    }
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
            };
            this.userDataManager = null;
        }
    }

    async initializeApp() {
        try {
            await this.loadData();
            this.loadSettings();
            this.loadFavorites();
            this.setupEventListeners();
            this.setupCardConfigModal();
            this.setupAuthEventListeners();
            this.setupAuthStateHandler();
            this.showWelcomeMessage();
            
            // Show the default start page from settings
            const defaultPage = this.settings.defaultStartPage || 'start';
            this.showPage(defaultPage);
            
            // Initialize auth UI
            this.updateAuthUI();
        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
        }
    }

    async loadData() {
        try {
            // Lade echte Daten aus der JSON-Datei
            const response = await fetch('wien_opnv_data.json');
            if (response.ok) {
                const data = await response.json();
                this.stations = data.stations || [];
                this.linesData = data.lines || [];
                console.log(`✓ ${this.stations.length} Stationen und ${this.linesData.length} Linien geladen`);
            } else {
                throw new Error(`HTTP ${response.status}: Kann Daten nicht laden`);
            }
        } catch (error) {
            console.error('❌ Fehler beim Laden der Daten:', error);
            this.showErrorMessage('Stationsdaten konnten nicht geladen werden. Bitte stellen Sie sicher, dass die Daten verarbeitet wurden.');
            throw error;
        }
    }

    showErrorMessage(message) {
        const container = document.getElementById('app');
        if (!container) return;
        
        container.innerHTML = `
            <div class="container mt-4">
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Fehler beim Laden</h4>
                    <p>${message}</p>
                    <hr>
                    <p class="mb-0">
                        Führen Sie zuerst das Python-Skript aus: 
                        <code>python process_data.py</code>
                    </p>
                    <button class="btn btn-outline-danger mt-2" onclick="location.reload()">
                        Seite neu laden
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.showPage(page);
            });
        });

        const searchInput = document.getElementById('stationSearch');
        const clearBtn = document.getElementById('clearSearch');
        const refreshBtn = document.getElementById('refreshBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleStationSearch(e.target.value);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshDepartures();
            });
        }

        // Settings
        const darkModeToggle = document.getElementById('darkModeToggle');
        const defaultStartPageSelect = document.getElementById('defaultStartPage');
        
        if (defaultStartPageSelect) {
            defaultStartPageSelect.addEventListener('change', (e) => {
                this.setDefaultStartPage(e.target.value);
            });
        }
        
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', () => {
                this.toggleDarkMode();
            });
        }

        const clearFavorites = document.getElementById('clearFavorites');
        if (clearFavorites) {
            clearFavorites.addEventListener('click', () => {
                this.clearAllFavorites();
            });
        }

        // Quick actions
        const nearbyBtn = document.getElementById('nearbyStations');
        if (nearbyBtn) {
            nearbyBtn.addEventListener('click', () => {
                this.showNearbyStations();
            });
        }

        const recentBtn = document.getElementById('recentStations');
        if (recentBtn) {
            recentBtn.addEventListener('click', () => {
                this.showRecentStations();
            });
        }

        // Add to favorites
        const addToFavorites = document.getElementById('addToFavorites');
        if (addToFavorites) {
            addToFavorites.addEventListener('click', () => {
                this.addToFavorites();
            });
        }

        // Initialize favorites and settings
        this.loadFavorites();
        this.loadSettings();
        
        // Auto-refresh is now handled per card, not globally
        console.log('✅ App initialization completed');
    }

    handleStationSearch(query) {
        const searchResults = document.getElementById('searchResults');
        
        if (!searchResults) return;
        
        if (query.length < 2) {
            // Zeige Favoriten wenn Suchfeld leer/kurz ist
            this.displayFavoriteQuickSelect();
            return;
        }

        const filteredStations = this.stations.filter(station =>
            station.name.toLowerCase().includes(query.toLowerCase())
        );

        this.displaySearchResults(filteredStations);
    }

    displayFavoriteQuickSelect() {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults || !this.favorites || this.favorites.length === 0) {
            searchResults.innerHTML = '';
            return;
        }

        const html = `
            <div class="favorites-quick-select">
                <h4><i class="fas fa-star"></i> Favoriten</h4>
                <div class="favorites-list">
                    ${this.favorites.map(station => `
                        <div class="search-result favorite-item" onclick="app.selectStation('${station.diva}')">
                            <div class="station-info">
                                <span class="station-name">${station.name}</span>
                                <span class="station-details">${station.rbls?.length || 0} RBLs</span>
                            </div>
                            <i class="fas fa-star favorite-star active"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        searchResults.innerHTML = html;
    }

    displaySearchResults(stations) {
        const searchResults = document.getElementById('searchResults');
        
        if (!searchResults) return;
        
        if (stations.length === 0) {
            searchResults.innerHTML = '<div class="no-data">Keine Stationen gefunden</div>';
            return;
        }

        this.loadFavorites();
        const html = stations.map(station => {
            const isFavorite = this.favorites.some(fav => fav.diva === station.diva);
            return `
                <div class="search-result-item" onclick="app.selectStation('${station.diva}')">
                    <div class="station-name">${station.name}</div>
                    <div class="station-info">
                        <span class="rbl-count">${station.rbl_count} RBL-Nummern</span>
                        <span class="municipality">${station.municipality}</span>
                    </div>
                    <button class="favorite-star ${isFavorite ? 'favorited' : ''}" 
                            onclick="event.stopPropagation(); app.toggleFavorite('${station.diva}', this)"
                            title="${isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
            `;
        }).join('');

        searchResults.innerHTML = html;
    }

    selectStation(diva) {
        const station = this.stations.find(s => s.diva === diva);
        if (!station) return;

        this.selectedStation = station;
        this.currentRBLs = station.rbls || [];
        
        this.showSelectedStation();
        this.loadDepartures();
    }

    showSelectedStation() {
        const selectedStationContainer = document.getElementById('selectedStation');
        if (!selectedStationContainer || !this.selectedStation) return;

        selectedStationContainer.innerHTML = `
            <div class="selected-station-card">
                <div class="station-header">
                    <h3>${this.selectedStation.name}</h3>
                    <button class="info-icon" id="stationInfoIcon" onclick="window.app.showStationInfo()" title="Live-Daten Status anzeigen" style="display: none;">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
                <div class="station-details">
                    <span class="detail-item">RBL-Nummern: ${this.currentRBLs.join(', ')}</span>
                    <span class="detail-item">Anzahl: ${this.currentRBLs.length}</span>
                </div>
            </div>
        `;
        
        // Scroll zu den Abfahrten
        document.getElementById('departures-section')?.scrollIntoView({ behavior: 'smooth' });
    }

    clearSearch() {
        const searchInput = document.getElementById('stationSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';
    }

    showStationInfo() {
        if (!this.rblStats) {
            alert('Keine Live-Daten Statistiken verfügbar. Bitte laden Sie zuerst Abfahrten.');
            return;
        }

        this.openStationInfoModal();
    }

    openStationInfoModal() {
        const modal = document.getElementById('stationInfoModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = `Live-Daten Status: ${this.selectedStation.name}`;
        
        const stats = this.rblStats;
        let content = '';
        
        // Übersichts-Header
        content += `
            <div class="modal-section">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 16px; background: var(--success-color); color: white; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${stats.successful}</div>
                        <div style="font-size: 0.9rem;">Erfolgreich</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--danger-color); color: white; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${stats.failed.length}</div>
                        <div style="font-size: 0.9rem;">Fehler</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--warning-color); color: white; border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: bold;">${stats.invalid.length}</div>
                        <div style="font-size: 0.9rem;">Ungültig</div>
                    </div>
                </div>
            </div>
        `;
        
        // RBL Details
        content += '<div class="modal-section">';
        content += '<h4><i class="fas fa-list"></i> RBL Details</h4>';
        
        this.currentRBLs.forEach(rbl => {
            const details = stats.rblDetails[rbl] || {
                status: 'unknown',
                lines: [],
                expectedLines: ['Unbekannt'],
                departureCount: 0
            };
            
            let statusClass = 'error';
            let statusIcon = 'fas fa-times-circle';
            let statusText = 'Fehler';
            let linesText = '';
            
            if (details.status === 'success') {
                statusClass = 'success';
                statusIcon = 'fas fa-check-circle';
                statusText = `${details.departureCount} Abfahrten`;
                linesText = details.lines.join(', ');
            } else if (details.status === 'invalid') {
                statusClass = 'warning';
                statusIcon = 'fas fa-exclamation-triangle';
                statusText = 'Ungültig';
                linesText = (details.expectedLines || ['Unbekannt']).join(', ') + ' (erwartet)';
            } else {
                // Fehler oder no_data
                linesText = (details.expectedLines || ['Unbekannt']).join(', ') + ' (erwartet)';
            }
            
            content += `
                <div class="rbl-item">
                    <div class="rbl-info">
                        <div class="rbl-number">RBL ${rbl}</div>
                        <div class="rbl-lines">${linesText}</div>
                    </div>
                    <div class="rbl-status ${statusClass}">
                        <i class="${statusIcon} status-icon"></i>
                        <span>${statusText}</span>
                    </div>
                </div>
            `;
        });
        
        content += '</div>';
        
        modalBody.innerHTML = content;
        modal.classList.add('show');
        
        // ESC-Taste Listener
        document.addEventListener('keydown', this.handleEscapeKey.bind(this));
        
        // Click außerhalb Modal schließen
        modal.addEventListener('click', this.handleModalBackdropClick.bind(this));
    }

    closeStationInfoModal() {
        const modal = document.getElementById('stationInfoModal');
        modal.classList.remove('show');
        modal.classList.remove('open');
        modal.style.display = 'none';
        document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
        modal.removeEventListener('click', this.handleModalBackdropClick.bind(this));
    }

    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            this.closeStationInfoModal();
        }
    }

    handleModalBackdropClick(event) {
        const modalContent = event.target.closest('.modal-content');
        if (!modalContent) {
            this.closeStationInfoModal();
        }
    }

    showInfoIcon() {
        const infoIcon = document.getElementById('stationInfoIcon');
        if (infoIcon && this.rblStats) {
            infoIcon.style.display = 'flex';
            
            // Icon-Farbe basierend auf Status setzen
            const stats = this.rblStats;
            if (stats.successful === stats.total) {
                infoIcon.style.color = 'var(--success-color)'; // Grün wenn alles OK
            } else if (stats.successful > 0) {
                infoIcon.style.color = 'var(--warning-color)'; // Orange wenn teilweise
            } else {
                infoIcon.style.color = 'var(--danger-color)'; // Rot wenn nichts funktioniert
            }
        }
    }

    getExpectedLinesForRBL(rbl) {
        // Einfache Heuristik basierend auf Station-Namen und bekannten Mustern
        if (this.selectedStation) {
            const stationName = this.selectedStation.name.toLowerCase();
            
            // U-Bahn Stationen (häufige Namen)
            if (stationName.includes('karlsplatz')) return ['U1', 'U2', 'U4'];
            if (stationName.includes('stephansplatz')) return ['U1', 'U3'];
            if (stationName.includes('westbahnhof')) return ['U3', 'U6'];
            if (stationName.includes('schwedenplatz')) return ['U1', 'U4'];
            if (stationName.includes('schottenring')) return ['U2', 'U4'];
            
            // Allgemeine Muster für Linientypen
            if (stationName.includes('u-') || stationName.includes('metro')) {
                return ['U-Bahn']; // Generisch für U-Bahn Stationen
            }
        }
        
        // Fallback: Keine spezifischen Linien bekannt
        return ['Unbekannt'];
    }

    async loadDepartures() {
        if (this.currentRBLs.length === 0) return;

        this.showLoading();
        this.hideError();
        this.updateLoadingProgress('Lade Abfahrten...', 0, this.currentRBLs.length);

        try {
            // Versuche echte Live-Daten von der Wiener Linien API zu holen
            const departures = await this.fetchLiveDepartures(this.currentRBLs);
            this.displayDepartures(departures);
        } catch (error) {
            console.error('Fehler beim Laden der Abfahrten:', error);
            this.showError('Fehler beim Laden der Live-Daten. Überprüfen Sie Ihre Internetverbindung.');
        } finally {
            this.hideLoading();
            this.updateLastRefreshTime();
            this.showInfoIcon();
        }
    }

    async fetchLiveDepartures(rbls) {
        const allDepartures = [];
        let hasErrors = false;
        let errorMessage = '';
        let successfulRBLs = 0;
        let invalidRBLs = [];
        
        // Speichere Statistiken für Info-Icon
        this.rblStats = {
            total: rbls.length,
            successful: 0,
            failed: [],
            invalid: [],
            rblDetails: {} // Speichere RBL -> Linien Mapping
        };
        
        // Initialisiere RBL-Details mit bekannten Informationen aus der Station
        rbls.forEach(rbl => {
            this.rblStats.rblDetails[rbl] = {
                status: 'loading',
                lines: [], // Wird bei erfolgreichen Anfragen gefüllt
                expectedLines: this.getExpectedLinesForRBL(rbl), // Aus Station-Daten
                departureCount: 0
            };
        });
        
        // Hole Daten sequenziell mit kleiner Pause zwischen Anfragen
        for (let i = 0; i < rbls.length; i++) {
            try {
                const rbl = rbls[i];
                this.updateLoadingProgress(`Lade RBL ${rbl}...`, i + 1, rbls.length);
                
                const departures = await this.fetchDeparturesForRBL(rbl);
                
                if (departures && departures.length > 0) {
                    allDepartures.push(...departures);
                    successfulRBLs++;
                    this.rblStats.successful++;
                    
                    // Sammle Linien-Informationen für dieses RBL
                    const lines = [...new Set(departures.map(dep => dep.line))].sort();
                    this.rblStats.rblDetails[rbl] = {
                        status: 'success',
                        lines: lines,
                        departureCount: departures.length
                    };
                } else {
                    this.rblStats.failed.push(rbl);
                    this.rblStats.rblDetails[rbl] = {
                        status: 'no_data',
                        lines: [],
                        departureCount: 0
                    };
                }
                
                // Kleine Pause zwischen Anfragen um Rate Limit zu vermeiden
                if (i < rbls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                console.warn(`Fehler bei RBL ${rbls[i]}:`, error.message);
                
                // Unterscheide zwischen verschiedenen Fehlertypen
                if (error.message.includes('Zugriff verweigert') || error.message.includes('403')) {
                    invalidRBLs.push(rbls[i]);
                    this.rblStats.invalid.push(rbls[i]);
                    this.rblStats.rblDetails[rbls[i]] = {
                        status: 'invalid',
                        lines: [],
                        departureCount: 0,
                        error: 'RBL ungültig oder veraltet'
                    };
                    console.log(`⚠️ RBL ${rbls[i]} ist möglicherweise veraltet oder nicht verfügbar`);
                } else {
                    this.rblStats.failed.push(rbls[i]);
                    this.rblStats.rblDetails[rbls[i]] = {
                        status: 'error',
                        lines: [],
                        departureCount: 0,
                        error: error.message
                    };
                    hasErrors = true;
                    if (!errorMessage) {
                        errorMessage = error.message || 'Unbekannter Fehler';
                    }
                    
                    // Bei Rate Limit: Längere Pause
                    if (error.message.includes('Rate Limit') || error.message.includes('429')) {
                        console.log('⏱️ Rate Limit erreicht - warte 2 Sekunden...');
                        this.updateLoadingProgress('Rate Limit - warte...', i + 1, rbls.length);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        }

        // Zeige Warnung für ungültige RBLs
        if (invalidRBLs.length > 0) {
            console.log(`⚠️ ${invalidRBLs.length} von ${rbls.length} RBLs sind nicht verfügbar:`, invalidRBLs);
            this.showWarning(`${invalidRBLs.length} Haltestellen-IDs sind veraltet und konnten nicht geladen werden.`);
        }

        // Wenn wir zumindest einige Daten haben, zeige sie an
        if (allDepartures.length > 0) {
            console.log(`✅ ${successfulRBLs} von ${rbls.length} RBLs erfolgreich geladen`);
            return allDepartures;
        }

        // Nur wenn alle RBLs fehlschlagen UND es ein echter Fehler ist
        if (hasErrors) {
            throw new Error(errorMessage || 'API nicht verfügbar');
        } else if (invalidRBLs.length === rbls.length) {
            throw new Error('Alle Haltestellen-IDs sind veraltet oder nicht verfügbar');
        } else {
            throw new Error('Keine Abfahrten gefunden für diese Station');
        }

        // Sortiere nach Zeit und limitiere auf 20 Abfahrten
        return allDepartures
            .sort((a, b) => a.minutesUntil - b.minutesUntil)
            .slice(0, 20);
    }

    async fetchLiveDeparturesWithProgress(rbls, context = 'search') {
        const allDepartures = [];
        let hasErrors = false;
        let errorMessage = '';
        let successfulRBLs = 0;
        let invalidRBLs = [];
        
        // Hole Daten sequenziell mit Fortschrittsanzeige
        for (let i = 0; i < rbls.length; i++) {
            try {
                const rbl = rbls[i];
                
                // Update progress für Favoriten-Seite
                if (context === 'favorite') {
                    this.updateFavoriteProgress(i + 1, rbls.length);
                } else {
                    this.updateLoadingProgress(`Lade RBL ${rbl}...`, i + 1, rbls.length);
                }
                
                const departures = await this.fetchDeparturesForRBL(rbl);
                
                if (departures && departures.length > 0) {
                    allDepartures.push(...departures);
                    successfulRBLs++;
                }
                
                // Kleine Pause zwischen Anfragen
                if (i < rbls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                console.error(`Fehler bei RBL ${rbls[i]}:`, error);
                
                // RBL als ungültig markieren wenn 404
                if (error.message.includes('404') || error.message.includes('not found')) {
                    invalidRBLs.push(rbls[i]);
                } else {
                    hasErrors = true;
                    if (!errorMessage) {
                        errorMessage = error.message || 'Unbekannter Fehler';
                    }
                    
                    // Bei Rate Limit: Längere Pause
                    if (error.message.includes('Rate Limit') || error.message.includes('429')) {
                        console.log('⏱️ Rate Limit erreicht - warte 2 Sekunden...');
                        if (context === 'favorite') {
                            this.updateFavoriteProgress(i + 1, rbls.length, 'Rate Limit - warte...');
                        } else {
                            this.updateLoadingProgress('Rate Limit - warte...', i + 1, rbls.length);
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        }

        // Zeige Warnung für ungültige RBLs
        if (invalidRBLs.length > 0) {
            console.log(`⚠️ ${invalidRBLs.length} von ${rbls.length} RBLs sind nicht verfügbar:`, invalidRBLs);
        }

        // Wenn wir zumindest einige Daten haben, zeige sie an
        if (allDepartures.length > 0) {
            console.log(`✅ ${successfulRBLs} von ${rbls.length} RBLs erfolgreich geladen`);
            return allDepartures;
        }

        // Nur wenn alle RBLs fehlschlagen UND es ein echter Fehler ist
        if (hasErrors) {
            throw new Error(errorMessage || 'API nicht verfügbar');
        } else if (invalidRBLs.length === rbls.length) {
            throw new Error('Alle Haltestellen-IDs sind veraltet oder nicht verfügbar');
        } else {
            throw new Error('Keine Abfahrten gefunden für diese Station');
        }

        // Sortiere nach Zeit und limitiere auf 20 Abfahrten
        return allDepartures
            .sort((a, b) => a.minutesUntil - b.minutesUntil)
            .slice(0, 20);
    }

    async fetchDeparturesForRBL(rbl) {
        try {
            // Verwende lokalen npm-Server für API-Aufrufe
            const apiUrl = `/api/departures/${rbl}`;
            
            console.log(`🔄 Hole Live-Daten für RBL ${rbl}...`);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                
                if (errorData) {
                    // Spezielle Behandlung für Rate Limit
                    if (response.status === 429) {
                        const error = new Error(`Rate Limit erreicht: ${errorData.message}`);
                        error.status = 429;
                        error.retryAfter = errorData.retryAfter || 60;
                        throw error;
                    }
                    throw new Error(`${errorData.error}: ${errorData.message}`);
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`${data.error}: ${data.message}`);
            }
            
            console.log(`✓ Live-Daten für RBL ${rbl} erhalten`);
            return this.parseWienerLinienData(data, rbl);
            
        } catch (error) {
            console.error(`❌ API-Fehler für RBL ${rbl}:`, error.message);
            
            // Benutzerfreundliche Fehlermeldung anzeigen
            this.showApiError(error.message);
            
            return null;
        }
    }

    parseWienerLinienData(data, rbl) {
        const departures = [];
        
        if (!data || !data.data || !data.data.monitors) {
            console.warn(`⚠️ Keine Monitor-Daten für RBL ${rbl}`);
            return departures;
        }

        data.data.monitors.forEach(monitor => {
            if (monitor.lines && monitor.lines.length > 0) {
                monitor.lines.forEach(line => {
                    if (line.departures && line.departures.departure) {
                        const lineDepartures = Array.isArray(line.departures.departure) 
                            ? line.departures.departure 
                            : [line.departures.departure];
                        
                        lineDepartures.forEach(departure => {
                            // Bestimme Linientyp basierend auf der Linie
                            let type = 'bus';
                            let color = '#007bff';
                            
                            const lineText = line.name || '';
                            if (lineText.startsWith('U')) {
                                type = 'metro';
                                color = '#dc3545';
                            } else if (/^[0-9]+$/.test(lineText) || ['D', 'O'].includes(lineText)) {
                                type = 'tram';
                                color = '#fd7e14';
                            }

                            // Berechne Minuten bis Abfahrt
                            let minutesUntil = 0;
                            if (departure.departureTime && departure.departureTime.countdown !== undefined) {
                                minutesUntil = Math.max(0, departure.departureTime.countdown);
                            }

                            // Geplante Zeit formatieren
                            let scheduledTime = 'N/A';
                            let realTime = null;
                            let delay = 0;
                            
                            if (departure.departureTime && departure.departureTime.timePlanned) {
                                try {
                                    const planned = new Date(departure.departureTime.timePlanned);
                                    scheduledTime = planned.toLocaleTimeString('de-AT', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    
                                    // Echtzeitdaten verarbeiten
                                    if (departure.departureTime.timeReal) {
                                        const real = new Date(departure.departureTime.timeReal);
                                        realTime = real.toLocaleTimeString('de-AT', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                        
                                        // Verspätung in Minuten berechnen
                                        delay = Math.round((real - planned) / (1000 * 60));
                                    }
                                } catch (e) {
                                    console.warn('Fehler beim Parsen der Zeit:', e);
                                }
                            }

                            departures.push({
                                rbl: rbl,
                                line: lineText,
                                towards: line.towards || departure.destination || 'Unbekannte Richtung',
                                direction: line.towards || departure.destination || 'Unbekannte Richtung',
                                minutesUntil: minutesUntil,
                                scheduledTime: scheduledTime,
                                realTime: realTime,
                                delay: delay,
                                realtime: departure.departureTime && departure.departureTime.timeReal !== undefined,
                                type: type,
                                color: color,
                                platform: line.platform || departure.vehicle?.platform || null,
                                barrier: line.barrierFree || false,
                                lineId: line.lineId || lineText,
                                countdown: minutesUntil
                            });
                        });
                    }
                });
            }
        });

        console.log(`📊 ${departures.length} Abfahrten für RBL ${rbl} verarbeitet`);
        return departures;
    }

    generateFallbackData(rbl) {
        // Minimaler Fallback wenn API nicht verfügbar
        return [{
            rbl: rbl,
            line: 'API',
            direction: 'Live-Daten nicht verfügbar - Proxy-Server starten',
            minutesUntil: 0,
            scheduledTime: new Date().toLocaleTimeString('de-AT', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            realtime: false,
            type: 'info',
            color: '#6c757d',
            platform: null
        }];
    }

    displayDepartures(departures) {
        const departuresContainer = document.getElementById('departuresContainer');
        if (!departuresContainer) return;

        if (departures.length === 0) {
            departuresContainer.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
            return;
        }

        // Gruppiere Abfahrten nach Linie
        const groupedDepartures = this.groupDeparturesByLine(departures);

        const html = Object.keys(groupedDepartures).map(lineKey => {
            const lineDepartures = groupedDepartures[lineKey];
            const firstDeparture = lineDepartures[0];
            const lineId = `line-${lineKey.replace(/[^a-zA-Z0-9]/g, '')}`;
            
            // Zeige initial nur die ersten 2 Abfahrten
            const initialDepartures = lineDepartures.slice(0, 2);
            const hiddenDepartures = lineDepartures.slice(2);
            
            return `
                <div class="departure-line-group">
                    <div class="line-header">
                        <div class="line-info">
                            <span class="line-badge line-${firstDeparture.type} ${this.getLineBadgeClass(firstDeparture.line, firstDeparture.type)}">
                                ${firstDeparture.line}
                            </span>
                            <span class="line-type">${this.getLineTypeText(firstDeparture.type)}</span>
                        </div>
                        <button class="favorite-star line-favorite ${this.isFavoriteStation() ? 'favorited' : ''}" 
                                onclick="event.stopPropagation(); app.toggleCurrentStationFavorite(this)"
                                title="${this.isFavoriteStation() ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <div class="departures-list">
                        ${this.renderSearchDepartureItems(initialDepartures, 'visible')}
                        ${hiddenDepartures.length > 0 ? this.renderSearchDepartureItems(hiddenDepartures, 'hidden', lineId) : ''}
                        ${hiddenDepartures.length > 0 ? `
                            <div class="show-more-container">
                                <button class="show-more-btn" onclick="window.app.showMoreDepartures('${lineId}', this)">
                                    <i class="fas fa-chevron-down"></i>
                                    <span>+${hiddenDepartures.length} weitere anzeigen</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        departuresContainer.innerHTML = html;
    }

    renderDepartureItems(departures, visibility, lineId = '') {
        const visibilityClass = visibility === 'hidden' ? `hidden-departures ${lineId}-hidden` : '';
        
        return departures.map(dep => {
            // Verspätungstext formatieren
            let delayText = '';
            let delayClass = '';
            
            if (dep.realtime && dep.delay !== 0) {
                if (dep.delay > 0) {
                    delayText = ` (+${dep.delay})`;
                    delayClass = 'delay-late';
                } else {
                    delayText = ` (${dep.delay})`;
                    delayClass = 'delay-early';
                }
            } else if (dep.realtime) {
                delayText = ' (pünktlich)';
                delayClass = 'delay-ontime';
            }
            
            // Zeitfarbe bestimmen
            let timeColorClass = '';
            if (dep.realtime) {
                if (dep.delay <= 0) {
                    timeColorClass = 'time-good'; // grün für pünktlich/früh
                } else {
                    timeColorClass = 'time-late'; // rot für verspätet
                }
            }
            
            return `
                <div class="departure-item ${visibilityClass}">
                    <div class="departure-main">
                        <div class="direction">${dep.direction}</div>
                        <div class="time-info">
                            <div class="time-display">
                                <span class="scheduled-time">Geplant: ${dep.scheduledTime}</span>
                                ${dep.realTime ? `
                                    <span class="real-time ${timeColorClass}">
                                        Ankunft: ${dep.realTime}
                                        ${delayText ? `<span class="delay-info ${delayClass}">${delayText}</span>` : ''}
                                        ${dep.realtime ? '<span class="realtime-indicator"></span>' : ''}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="countdown-badge ${dep.minutesUntil <= 2 ? 'urgent' : ''}">${this.formatCountdown(dep.minutesUntil)}</div>
                    </div>
                    <div class="departure-footer">
                        ${dep.platform ? `<span class="platform">Steig ${dep.platform}</span>` : ''}
                        <span class="rbl-info">RBL: ${dep.rbl}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSearchDepartureItems(departures, visibility, lineId = '') {
        const visibilityClass = visibility === 'hidden' ? `hidden-departures ${lineId}-hidden` : '';
        
        return departures.map(dep => {
            // Determine delay status for coloring
            const delay = dep.delay || 0;
            const isRealtime = dep.realtime;
            let timeClass = '';
            let delayIndicator = '';
            
            if (isRealtime) {
                if (delay >= -1 && delay <= 2) {
                    timeClass = 'on-time';
                    delayIndicator = delay > 0 ? `+${delay}` : delay < 0 ? `${delay}` : '';
                } else {
                    timeClass = 'delayed';
                    delayIndicator = delay > 0 ? `+${delay}` : `${delay}`;
                }
            }

            const actualTime = dep.realTime || dep.scheduledTime;
            const scheduledTime = dep.scheduledTime;
            
            return `
                <div class="search-departure-item ${visibilityClass}">
                    <div class="search-departure-main">
                        <div class="search-line-info">
                            <span class="search-line-number" style="background-color: ${this.getLineColor(dep.line)}">${dep.line}</span>
                            <span class="search-direction">${dep.direction}</span>
                        </div>
                        <div class="search-time-section">
                            <div class="search-time-info">
                                <div class="search-actual-time ${timeClass}">
                                    ${actualTime}
                                    ${delayIndicator && isRealtime ? ` (${delayIndicator})` : ''}
                                </div>
                                ${dep.realTime && dep.realTime !== scheduledTime ? `
                                    <div class="search-scheduled-time">Plan: ${scheduledTime}</div>
                                ` : ''}
                            </div>
                            <div class="search-countdown ${dep.minutesUntil <= 2 ? 'urgent' : ''}">${this.formatCountdown(dep.minutesUntil)}</div>
                            <button class="search-info-icon" 
                                    onclick="app.showDepartureDetails('${dep.rbl}', '${dep.line}', '${dep.direction}', ${dep.platform ? `'${dep.platform}'` : 'null'})"
                                    title="Details anzeigen">
                                <i class="fas fa-info"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showMoreDepartures(lineId, buttonElement) {
        const hiddenDepartures = document.querySelectorAll(`.${lineId}-hidden`);
        const button = buttonElement;
        
        // Zeige die nächsten 2 versteckten Abfahrten
        let shownCount = 0;
        const maxShow = 2;
        
        for (let i = 0; i < hiddenDepartures.length && shownCount < maxShow; i++) {
            const departure = hiddenDepartures[i];
            if (departure.style.display === 'none' || departure.classList.contains('hidden-departures')) {
                departure.style.display = 'block';
                departure.classList.remove('hidden-departures');
                shownCount++;
            }
        }
        
        // Prüfe ob noch weitere Abfahrten versteckt sind
        const remainingHidden = Array.from(hiddenDepartures).filter(dep => 
            dep.style.display === 'none' || dep.classList.contains('hidden-departures')
        );
        
        if (remainingHidden.length === 0) {
            // Alle angezeigt - Button ausblenden
            button.closest('.show-more-container').style.display = 'none';
        } else {
            // Aktualisiere die Anzahl im Button
            const span = button.querySelector('span');
            span.textContent = `+${remainingHidden.length} weitere anzeigen`;
        }
    }

    showDepartureDetails(rbl, line, direction, platform) {
        const title = `Details: Linie ${line}`;
        const details = `
            <div class="departure-details">
                <h4>${line} → ${direction}</h4>
                <div class="detail-item">
                    <strong>RBL:</strong> ${rbl}
                </div>
                ${platform ? `
                <div class="detail-item">
                    <strong>Steig:</strong> ${platform}
                </div>
                ` : ''}
                <div class="detail-item">
                    <strong>Station:</strong> ${this.selectedStation?.name || 'Unbekannt'}
                </div>
            </div>
        `;
        
        // Show in a simple alert for now - could be enhanced with a modal later
        alert(`${title}\n\nLinie: ${line}\nRichtung: ${direction}\nRBL: ${rbl}${platform ? `\nSteig: ${platform}` : ''}\nStation: ${this.selectedStation?.name || 'Unbekannt'}`);
    }

    groupDeparturesByLine(departures) {
        const grouped = {};
        
        departures.forEach(dep => {
            const key = `${dep.line}_${dep.direction}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(dep);
        });

        // Sortiere jede Gruppe nach Zeit
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => {
                const timeA = this.parseCountdown(a.countdown) || a.minutesUntil || 0;
                const timeB = this.parseCountdown(b.countdown) || b.minutesUntil || 0;
                return timeA - timeB;
            });
        });

        return grouped;
    }

    getLineTypeText(type) {
        const types = {
            metro: 'U-Bahn',
            tram: 'Straßenbahn',
            bus: 'Bus'
        };
        return types[type] || 'ÖPNV';
    }

    getLineBadgeClass(line, type) {
        // Für U-Bahn: spezifische Linienklasse hinzufügen
        if (type === 'metro') {
            return `line-${line}`;
        }
        return '';
    }

    formatCountdown(minutes) {
        if (minutes === 0) return 'Jetzt';
        if (minutes === 1) return '1 Min';
        return `${minutes} Min`;
    }

    showLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'block';
    }

    updateLoadingProgress(message, current, total) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            const percentage = Math.round((current / total) * 100);
            loadingElement.innerHTML = `
                <i class="fas fa-subway fa-spin"></i>
                <div style="margin-top: 10px;">${message}</div>
                <div style="margin-top: 5px; font-size: 0.9rem; color: var(--text-secondary);">
                    ${current}/${total} (${percentage}%)
                </div>
            `;
        }
    }

    updateFavoriteProgress(current, total, customText = null) {
        const currentEl = document.getElementById('favoriteProgressCurrent');
        const totalEl = document.getElementById('favoriteProgressTotal');
        const percentEl = document.getElementById('favoriteProgressPercent');
        const progressBar = document.getElementById('favoriteProgressBar');
        const loadingText = document.querySelector('.loading-text');
        
        if (currentEl) currentEl.textContent = current;
        if (totalEl) totalEl.textContent = total;
        
        const percent = Math.round((current / total) * 100);
        if (percentEl) percentEl.textContent = percent;
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        if (loadingText && customText) {
            loadingText.textContent = customText;
        } else if (loadingText) {
            loadingText.textContent = `Lade Abfahrten... (${current}/${total})`;
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    showWarning(message) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.innerHTML = `
                <div style="background: var(--warning-color, #ff9800); color: white; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </div>
            `;
            errorElement.style.display = 'block';
            
            // Automatisch nach 8 Sekunden ausblenden
            setTimeout(() => {
                this.hideError();
            }, 8000);
        }
    }

    showApiError(message) {
        let userMessage = '';
        
        // Benutzerfreundliche Fehlermeldungen
        if (message.includes('Rate Limit erreicht') || message.includes('Rate limit')) {
            userMessage = '⚠️ Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
        } else if (message.includes('Service nicht verfügbar') || message.includes('nicht erreichbar')) {
            userMessage = '🔌 Die Wiener Linien API ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.';
        } else if (message.includes('Zeitüberschreitung') || message.includes('timeout')) {
            userMessage = '⏱️ Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.';
        } else if (message.includes('Zugriff verweigert')) {
            userMessage = '🚫 Zugriff auf die API wurde verweigert.';
        } else if (message.includes('nicht gefunden')) {
            userMessage = '🔍 Die angegebene Station wurde nicht gefunden.';
        } else {
            userMessage = `❌ ${message}`;
        }
        
        this.showError(userMessage);
        
        // Automatisch nach 10 Sekunden ausblenden
        setTimeout(() => {
            this.hideError();
        }, 10000);
    }

    hideError() {
        const errorElement = document.getElementById('error');
        if (errorElement) errorElement.style.display = 'none';
    }

    refreshDepartures() {
        if (this.selectedStation) {
            this.loadDepartures();
        }
    }

    updateLastRefreshTime() {
        const lastRefreshElement = document.getElementById('lastRefresh');
        if (lastRefreshElement) {
            const now = new Date();
            lastRefreshElement.textContent = `Zuletzt aktualisiert: ${now.toLocaleTimeString('de-AT')}`;
        }
    }

    showWelcomeMessage() {
        const selectedStationContainer = document.getElementById('selectedStation');
        const departuresContainer = document.getElementById('departuresContainer');
        
        if (selectedStationContainer) {
            selectedStationContainer.innerHTML = `
                <div class="welcome-message">
                    <h3>🚇 wann fahrma OIDA</h3>
                    <p>Willkommen! Geben Sie eine Station in das Suchfeld ein, um Live-Abfahrtszeiten anzuzeigen.</p>
                    <div class="info-cards">
                        <div class="info-card">
                            <strong>${this.stations.length}</strong> Stationen verfügbar
                        </div>
                        <div class="info-card">
                            <strong>Live-Daten</strong> alle 30 Sekunden
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (departuresContainer) {
            departuresContainer.innerHTML = '';
        }
    }

    // Navigation Functions
    async showPage(pageId) {
        // Reset previous page state before switching
        this.resetPageState();
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageId) {
                btn.classList.add('active');
            }
        });

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(pageId + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
        }

        // Load page specific content
        switch (pageId) {
            case 'start':
                await this.loadStartPage();
                break;
            case 'favorites':
                this.loadFavoritesPage();
                break;
            case 'settings':
                this.loadSettingsPage();
                break;
        }
    }

    resetPageState() {
        // Reset search state when leaving search page
        if (this.currentPage === 'search') {
            const searchInput = document.getElementById('stationSearch');
            const searchResults = document.getElementById('searchResults');
            const selectedStation = document.getElementById('selectedStation');
            const departuresSection = document.getElementById('departures');
            
            if (searchInput) {
                searchInput.value = '';
                // Trigger input event to clear search results
                searchInput.dispatchEvent(new Event('input'));
            }
            if (searchResults) searchResults.innerHTML = '';
            if (selectedStation) selectedStation.style.display = 'none';
            if (departuresSection) departuresSection.style.display = 'none';
            
            console.log('🔄 Search page reset');
        }
        
        // Reset favorites page state when leaving favorites page
        if (this.currentPage === 'favorites') {
            const favoriteDepartures = document.getElementById('favoriteDepartures');
            
            if (favoriteDepartures) favoriteDepartures.style.display = 'none';
            
            // Always reload favorites list to reset to default state
            this.loadFavoritesPage();
            
            console.log('🔄 Favorites page reset');
        }
        
        // Reset selected station and RBLs regardless of page
        this.selectedStation = null;
        this.currentRBLs = [];
        
        // Hide all page-specific sections
        const searchResults = document.getElementById('searchResults');
        const selectedStation = document.getElementById('selectedStation');
        const departuresSection = document.getElementById('departuresSection');
        const favoriteDepartures = document.getElementById('favoriteDepartures');
        
        if (searchResults) searchResults.innerHTML = '';
        if (selectedStation) selectedStation.style.display = 'none';
        if (departuresSection) departuresSection.style.display = 'none';
        if (favoriteDepartures) favoriteDepartures.style.display = 'none';
    }

    async loadStartPage() {
        console.log('🏠 Loading Start Page...');
        
        this.isEditMode = false;
        this.currentEditingCard = null;
        this.cardRefreshIntervals = {};
        
        // Ensure stations are loaded before dashboard
        if (!this.stations || this.stations.length === 0) {
            console.log('📡 Loading stations for dashboard...');
            this.loadStations().then(async () => {
                console.log('✅ Stations loaded, initializing dashboard...');
                await this.loadDashboard();
            });
        } else {
            console.log('✅ Stations already loaded, initializing dashboard...');
            await this.loadDashboard();
        }
        
        this.setupDashboardControls();
        this.setupModalEventHandlers();
        
        console.log('🏠 Start Page loaded');
    }

    // Debug function to search for stations
    searchStationDebug(searchTerm) {
        const matches = this.stations.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log(`🔍 Stations matching "${searchTerm}":`, matches.map(s => ({
            name: s.name,
            diva: s.diva,
            rbl_count: s.rbl_count,
            municipality: s.municipality
        })));
        return matches;
    }

    // Manual repair function for dashboard cards
    async repairCardManually(cardId, stationDiva) {
        const cards = await this.loadDashboardCards();
        const cardIndex = cards.findIndex(c => c.id === cardId);
        
        if (cardIndex === -1) {
            console.error('Card not found');
            return;
        }
        
        const station = this.stations.find(s => s.diva === stationDiva);
        if (!station) {
            console.error('Station not found');
            return;
        }
        
        cards[cardIndex].station = {
            name: station.name,
            diva: station.diva,
            municipality: station.municipality
        };
        cards[cardIndex].rblNumbers = station.rbl_list?.slice(0, cards[cardIndex].departureCount || 10) || [];
        cards[cardIndex].stationName = station.name;
        
        await this.saveDashboardCards(cards);
        console.log(`✅ Card repaired with ${cards[cardIndex].rblNumbers.length} RBLs`);
        
        // Reload dashboard
        await this.loadDashboard();
    }

    async repairDashboardCards() {
        console.log('🔧 Repairing dashboard cards...');
        const cards = await this.loadDashboardCards();
        let repairedCards = [];
        let needsRepair = false;
        
        cards.forEach(card => {
            console.log(`🔍 Checking card "${card.title}":`, card);
            
            // Check if card needs migration to new RBL-based format
            if (!card.rblNumbers || card.rblNumbers.length === 0) {
                needsRepair = true;
                console.log(`🔧 Migrating card "${card.title}" to new RBL format`);
                
                // Try to find station data and extract RBLs
                let rblNumbers = [];
                let foundStation = null;
                
                // Strategy 1: Direct RBL list from card station data
                if (card.station && card.station.rbl_list && Array.isArray(card.station.rbl_list)) {
                    rblNumbers = card.station.rbl_list.slice(0, card.departureCount || 10);
                    console.log(`✅ Found RBLs in card station data: ${rblNumbers.length}`);
                } 
                // Strategy 2: Search by DIVA
                else if (card.station && card.station.diva) {
                    foundStation = this.stations.find(s => s.diva === card.station.diva);
                    if (foundStation && foundStation.rbl_list) {
                        rblNumbers = foundStation.rbl_list.slice(0, card.departureCount || 10);
                        console.log(`✅ Found station by DIVA ${card.station.diva}: ${rblNumbers.length} RBLs`);
                    }
                }
                // Strategy 3: Search by name
                if (rblNumbers.length === 0 && (card.stationName || card.station?.name)) {
                    const searchName = card.stationName || card.station.name;
                    console.log(`🔍 Searching for station: "${searchName}"`);
                    
                    // Try exact match first
                    foundStation = this.stations.find(s => 
                        s.name.toLowerCase() === searchName.toLowerCase()
                    );
                    
                    // Try partial match
                    if (!foundStation) {
                        foundStation = this.stations.find(s => 
                            s.name.toLowerCase().includes(searchName.toLowerCase()) ||
                            searchName.toLowerCase().includes(s.name.toLowerCase())
                        );
                    }
                    
                    // Try without special characters
                    if (!foundStation) {
                        const normalizedSearch = searchName.toLowerCase().replace(/[äöüß]/g, (char) => {
                            const map = { 'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss' };
                            return map[char] || char;
                        });
                        foundStation = this.stations.find(s => {
                            const normalizedStation = s.name.toLowerCase().replace(/[äöüß]/g, (char) => {
                                const map = { 'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss' };
                                return map[char] || char;
                            });
                            return normalizedStation.includes(normalizedSearch) ||
                                   normalizedSearch.includes(normalizedStation);
                        });
                    }
                    
                    if (foundStation && foundStation.rbl_list) {
                        rblNumbers = foundStation.rbl_list.slice(0, card.departureCount || 10);
                        console.log(`✅ Found station by name search "${foundStation.name}": ${rblNumbers.length} RBLs`);
                    } else {
                        // Debug: Show similar stations
                        const similarStations = this.stations.filter(s => 
                            s.name.toLowerCase().includes(searchName.toLowerCase().substring(0, 4)) ||
                            searchName.toLowerCase().includes(s.name.toLowerCase().substring(0, 4))
                        ).slice(0, 5);
                        console.log(`🔍 Similar stations found:`, similarStations.map(s => s.name));
                    }
                }
                
                // Create migrated card
                const migratedCard = {
                    ...card,
                    station: {
                        name: card.station?.name || card.stationName || 'Unknown',
                        diva: card.station?.diva || 'unknown',
                        municipality: card.station?.municipality || 'Wien'
                    },
                    rblNumbers: rblNumbers
                };
                
                repairedCards.push(migratedCard);
                
                if (rblNumbers.length === 0) {
                    console.warn(`⚠️ Could not find RBL numbers for card "${card.title}" - station: ${card.stationName || card.station?.name}`);
                    
                    // Additional debugging: search for stations containing part of the name
                    const searchTerm = (card.stationName || card.station?.name || '').toLowerCase();
                    if (searchTerm.length > 3) {
                        const matchingStations = this.stations.filter(s => 
                            s.name.toLowerCase().includes(searchTerm.substring(0, 6))
                        );
                        if (matchingStations.length > 0) {
                            console.log(`🔍 Potential matches found:`, matchingStations.slice(0, 5).map(s => ({
                                name: s.name,
                                diva: s.diva,
                                rbl_count: s.rbl_count
                            })));
                        }
                    }
                } else {
                    console.log(`✅ Migrated card "${card.title}" with ${rblNumbers.length} RBLs`);
                }
            } else {
                // Card is already in new format
                console.log(`✅ Card "${card.title}" already has ${card.rblNumbers.length} RBLs`);
                repairedCards.push(card);
            }
        });
        
        if (needsRepair) {
            await this.saveDashboardCards(repairedCards);
            console.log('✅ Dashboard cards migrated to new RBL format');
        } else {
            console.log('✅ Dashboard cards are already in correct format');
        }
        
        return repairedCards;
    }

    async loadDashboard() {
        const dashboardCards = await this.loadDashboardCards();
        this.dashboardCards = dashboardCards; // Initialize the instance property
        const dashboardGrid = document.getElementById('dashboardGrid');
        const dashboardEmpty = document.getElementById('dashboardEmpty');
        
        if (!dashboardGrid) return;
        
        console.log(`📊 Loading ${dashboardCards.length} dashboard cards`);
        if (dashboardCards.length > 0) {
            console.log('📋 Dashboard cards data:', dashboardCards);
            console.log('📋 Loading order:', dashboardCards.map((c, index) => `${index + 1}. ${c.title}`));
        }
        
        // Clear existing cards first
        dashboardGrid.innerHTML = '';
        
        // Clear any existing refresh intervals
        if (this.cardRefreshIntervals) {
            Object.values(this.cardRefreshIntervals).forEach(interval => {
                clearInterval(interval);
            });
            this.cardRefreshIntervals = {};
        }
        
        if (dashboardCards.length === 0) {
            dashboardGrid.style.display = 'none';
            dashboardEmpty.style.display = 'block';
        } else {
            dashboardGrid.style.display = 'flex';
            dashboardEmpty.style.display = 'none';
            
            // Render cards in order - SYNCHRONOUSLY for DOM structure
            this.renderCardsInOrder(dashboardCards);
        }
    }

    renderCardsInOrder(cards) {
        console.log('🎯 Rendering cards in correct order');
        
        // First pass: Create all DOM elements in order
        cards.forEach((cardData, index) => {
            console.log(`📝 Creating DOM for card ${index + 1}: ${cardData.title}`);
            this.createCardDOM(cardData);
        });
        
        // Second pass: Load data asynchronously
        cards.forEach((cardData, index) => {
            setTimeout(() => {
                console.log(`🔄 Loading data for card ${index + 1}: ${cardData.title}`);
                this.loadCardDepartures(cardData);
            }, index * 300); // Stagger the API calls
        });
    }

    createCardDOM(cardData) {
        const grid = document.getElementById('dashboardGrid');
        
        // Remove existing card if updating
        const existingCard = document.getElementById(`card-${cardData.id}`);
        if (existingCard) {
            existingCard.remove();
        }
        
        const card = document.createElement('div');
        card.className = `dashboard-card ${cardData.size}`;
        card.id = `card-${cardData.id}`;
        card.setAttribute('data-card-id', cardData.id);
        
        // Initial card structure
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${cardData.title}</h3>
                <div class="card-info">
                    <button class="info-btn" title="Stationsinfo" onclick="app.openStationInfoFromCard('${cardData.id}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
                <div class="card-controls" style="display: none;">
                    <button onclick="app.addDashboardCard(app.getDashboardCard('${cardData.id}'))" class="edit-card-btn" title="Bearbeiten">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7"/>
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button onclick="app.removeDashboardCard('${cardData.id}')" class="remove-card-btn" title="Entfernen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-content">
                <div class="loading">Lade Abfahrten...</div>
            </div>
            <div class="card-footer">
                <div class="card-last-update" id="lastUpdate-${cardData.id}">
                    <span class="update-text">Lädt...</span>
                    <div class="refresh-spinner" id="spinner-${cardData.id}"></div>
                </div>
            </div>
        `;
        
        // IMPORTANT: Append in order to maintain sequence
        grid.appendChild(card);
        
        // Add edit controls if in edit mode
        if (this.isEditMode) {
            card.classList.add('edit-mode');
            this.addCardEditControls(card);
        }
        
        console.log(`✅ DOM created for card: ${cardData.title} (position: ${grid.children.length})`);
    }

    setupDashboardControls() {
        const addCardBtn = document.getElementById('addDashboardCard');
        const editDashboardBtn = document.getElementById('editDashboard');
        
        if (addCardBtn) {
            addCardBtn.onclick = () => this.addDashboardCard();
        }
        
        if (editDashboardBtn) {
            editDashboardBtn.onclick = () => this.toggleEditMode();
        }

        // Setup display options
        this.setupDisplayOptions();
    }

    setupDisplayOptions() {
        // Initialize display settings
        this.displaySettings = {
            timeDisplayOptions: JSON.parse(localStorage.getItem('wien_opnv_time_display_options')) || ['countdown'],
            autoRefresh: localStorage.getItem('wien_opnv_auto_refresh') !== 'false',
            refreshInterval: parseInt(localStorage.getItem('wien_opnv_refresh_interval')) || 30,
            hideEmptyCards: localStorage.getItem('wien_opnv_hide_empty_cards') === 'true',
            dashboardLayout: localStorage.getItem('wien_opnv_dashboard_layout') || 'list',
            enableAnimations: localStorage.getItem('wien_opnv_enable_animations') !== 'false'
        };

        // Setup options toggle
        const optionsToggle = document.getElementById('optionsToggle');
        const optionsContent = document.getElementById('optionsContent');
        
        if (optionsToggle && optionsContent) {
            optionsToggle.addEventListener('click', () => {
                const isExpanded = optionsContent.classList.contains('expanded');
                optionsContent.classList.toggle('expanded');
                optionsToggle.classList.toggle('expanded');
            });
        }

        // Setup option change handlers
        this.setupTimeDisplayOptions();
        this.setupAutoRefreshOptions();
        
        // Apply initial settings
        this.applyDisplaySettings();
    }

    setupTimeDisplayOptions() {
        const timeDisplayCheckboxes = document.querySelectorAll('input[name="timeDisplay"]');
        timeDisplayCheckboxes.forEach(checkbox => {
            checkbox.checked = this.displaySettings.timeDisplayOptions.includes(checkbox.value);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    // Add to selected options
                    if (!this.displaySettings.timeDisplayOptions.includes(checkbox.value)) {
                        this.displaySettings.timeDisplayOptions.push(checkbox.value);
                    }
                } else {
                    // Remove from selected options
                    this.displaySettings.timeDisplayOptions = this.displaySettings.timeDisplayOptions.filter(
                        option => option !== checkbox.value
                    );
                }
                
                // Ensure at least one option is always selected
                if (this.displaySettings.timeDisplayOptions.length === 0) {
                    this.displaySettings.timeDisplayOptions = ['countdown'];
                    checkbox.checked = checkbox.value === 'countdown';
                }
                
                localStorage.setItem('wien_opnv_time_display_options', JSON.stringify(this.displaySettings.timeDisplayOptions));
                this.refreshAllCards();
            });
        });
    }

    setupAutoRefreshOptions() {
        // Setup hide empty cards option (only remaining option in sidebar)
        const hideEmptyCardsCheckbox = document.getElementById('hideEmptyCards');
        if (hideEmptyCardsCheckbox) {
            hideEmptyCardsCheckbox.checked = this.displaySettings.hideEmptyCards;
            hideEmptyCardsCheckbox.addEventListener('change', () => {
                this.displaySettings.hideEmptyCards = hideEmptyCardsCheckbox.checked;
                localStorage.setItem('wien_opnv_hide_empty_cards', hideEmptyCardsCheckbox.checked);
                this.refreshAllCards();
            });
        }

        // Setup dashboard layout options
        this.setupDashboardLayoutOptions();
        
        // Setup animation toggle
        this.setupAnimationToggle();
    }

    setupDashboardLayoutOptions() {
        console.log('🔧 Setting up dashboard layout options...');
        const layoutOptions = document.querySelectorAll('input[name="dashboardLayout"]');
        console.log('📍 Found layout options:', layoutOptions.length);
        layoutOptions.forEach(radio => {
            console.log('📍 Radio value:', radio.value, 'Current setting:', this.displaySettings.dashboardLayout);
            radio.checked = radio.value === (this.displaySettings.dashboardLayout || 'list');
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    console.log('✅ Layout changed to:', radio.value);
                    this.displaySettings.dashboardLayout = radio.value;
                    localStorage.setItem('wien_opnv_dashboard_layout', radio.value);
                    this.applyDashboardLayout();
                }
            });
        });
    }

    setupAnimationToggle() {
        console.log('🔧 Setting up animation toggle...');
        const animationToggle = document.getElementById('enableAnimations');
        console.log('📍 Animation toggle found:', !!animationToggle);
        if (animationToggle) {
            animationToggle.checked = this.displaySettings.enableAnimations !== false; // Default to true
            console.log('📍 Animation setting:', this.displaySettings.enableAnimations);
            animationToggle.addEventListener('change', () => {
                console.log('✅ Animation changed to:', animationToggle.checked);
                this.displaySettings.enableAnimations = animationToggle.checked;
                localStorage.setItem('wien_opnv_enable_animations', animationToggle.checked);
                this.applyAnimationSettings();
            });
        }
    }

    applyDashboardLayout() {
        console.log('🎨 Applying dashboard layout...');
        const container = document.getElementById('dashboardGrid');
        console.log('📍 Container found:', !!container);
        if (!container) return;
        
        // Remove existing layout classes
        container.classList.remove('list-layout', 'tiles-layout');
        
        // Add new layout class
        const layout = this.displaySettings.dashboardLayout || 'list';
        console.log('📍 Applying layout:', layout);
        container.classList.add(`${layout}-layout`);
        console.log('📍 Container classes:', container.className);
    }

    applyAnimationSettings() {
        console.log('🎨 Applying animation settings...');
        const body = document.body;
        if (this.displaySettings.enableAnimations === false) {
            console.log('📍 Disabling animations');
            body.classList.add('animations-disabled');
        } else {
            console.log('📍 Enabling animations');
            body.classList.remove('animations-disabled');
        }
        console.log('📍 Body classes:', body.className);
    }

    applyDisplaySettings() {
        // Update hide empty cards checkbox
        const hideEmptyCardsCheckbox = document.getElementById('hideEmptyCards');
        if (hideEmptyCardsCheckbox) {
            hideEmptyCardsCheckbox.checked = this.displaySettings.hideEmptyCards;
        }

        // Update time display checkboxes
        const timeDisplayCheckboxes = document.querySelectorAll('input[name="timeDisplay"]');
        timeDisplayCheckboxes.forEach(checkbox => {
            checkbox.checked = this.displaySettings.timeDisplayOptions.includes(checkbox.value);
        });

        // Update dashboard layout radio buttons
        const layoutOptions = document.querySelectorAll('input[name="dashboardLayout"]');
        layoutOptions.forEach(radio => {
            radio.checked = radio.value === this.displaySettings.dashboardLayout;
        });

        // Update animation toggle
        const animationToggle = document.getElementById('enableAnimations');
        if (animationToggle) {
            animationToggle.checked = this.displaySettings.enableAnimations;
        }

        // Apply layout and animation settings
        this.applyDashboardLayout();
        this.applyAnimationSettings();
    }

    async refreshAllCards() {
        const cards = await this.loadDashboardCards();
        cards.forEach(card => {
            this.loadCardDepartures(card);
        });
    }

    updateAutoRefresh() {
        // Clear existing intervals
        if (this.globalRefreshInterval) {
            clearInterval(this.globalRefreshInterval);
            this.globalRefreshInterval = null;
        }

        // Setup new interval if enabled
        if (this.displaySettings.autoRefresh) {
            this.globalRefreshInterval = setInterval(() => {
                this.refreshAllCards();
                console.log(`🔄 Auto-refresh: Updated all cards (${this.displaySettings.refreshInterval}s interval)`);
            }, this.displaySettings.refreshInterval * 1000);
            
            console.log(`✅ Auto-refresh enabled: ${this.displaySettings.refreshInterval}s interval`);
        } else {
            console.log(`❌ Auto-refresh disabled`);
        }
    }

    addDashboardCard(existingCard = null) {
        // Check usage limits for new cards (not when editing existing)
        if (!existingCard) {
            const limits = this.checkUsageLimits();
            if (!limits.withinLimits) {
                this.showNotification(limits.reason, 'warning');
                return;
            }
        }
        
        this.currentEditingCard = existingCard;
        
        // Reset form
        document.getElementById('cardConfigForm').reset();
        const stationData = document.getElementById('cardStationData');
        if (stationData) stationData.value = '';
        
        const stationResults = document.getElementById('cardStationResults');
        if (stationResults) stationResults.style.display = 'none';
        
        const rblSection = document.getElementById('lineDirectionSection');
        if (rblSection) rblSection.style.display = 'none';
        
        const lineDirectionSection = document.getElementById('lineDirectionSection');
        if (lineDirectionSection) lineDirectionSection.style.display = 'none';
        
        // Set title
        const title = document.getElementById('cardConfigTitle');
        title.textContent = existingCard ? 'Karte bearbeiten' : 'Neue Dashboard-Karte';
        
        // Pre-fill if editing
        if (existingCard) {
            const cardTitle = document.getElementById('cardTitle');
            const cardRefreshInterval = document.getElementById('cardRefreshInterval');
            const cardStation = document.getElementById('cardStation');
            const cardStationData = document.getElementById('cardStationData');
            const autoSortDepartures = document.getElementById('autoSortDepartures');
            
            if (cardTitle) cardTitle.value = existingCard.title;
            if (cardRefreshInterval) cardRefreshInterval.value = existingCard.refreshInterval || 15;
            if (cardStation) cardStation.value = existingCard.stationName;
            if (cardStationData) cardStationData.value = JSON.stringify(existingCard.station);
            
            // Set new fields with defaults
            if (autoSortDepartures) autoSortDepartures.checked = existingCard.autoSort !== false; // Default to true
            
            // Load station and departure lines for editing
            if (existingCard.station && existingCard.departureLines) {
                // Set station data
                this.currentCardConfig.station = existingCard.station;
                this.currentCardConfig.title = existingCard.title;
                this.currentCardConfig.refreshInterval = existingCard.refreshInterval || 15;
                this.currentCardConfig.autoSort = existingCard.autoSort !== false;
                this.currentCardConfig.maxDepartureRows = existingCard.maxDepartureRows || 9;
                
                // Ensure existing departure lines have the cycling property
                this.currentCardConfig.departureLines = existingCard.departureLines.map(line => ({
                    ...line,
                    enableCycling: line.enableCycling !== false  // Default to true if not set
                }));
                
                // Set station input field
                const cardStation = document.getElementById('cardStation');
                if (cardStation) cardStation.value = existingCard.station.name || existingCard.station.title;
                
                // Show departures config section and populate it
                this.showDepartureConfigSection(existingCard.station);
                this.renderDepartureLinesList();
                this.updateCardPreview();
            }
            // Legacy support for old format  
            else if (existingCard.stationName) {
                // Try to find the station by name to get full data
                const foundStation = this.stations.find(s => 
                    s.name === existingCard.stationName || 
                    s.title === existingCard.stationName
                );
                
                if (foundStation) {
                    // Convert to new format
                    this.currentCardConfig.station = foundStation;
                    this.currentCardConfig.title = existingCard.title;
                    this.currentCardConfig.refreshInterval = existingCard.refreshInterval || 15;
                    this.currentCardConfig.displayMode = 'all';
                    this.currentCardConfig.cycleDuration = 5;
                    this.currentCardConfig.autoSort = true;
                    
                    // Convert old format to new departure lines format
                    if (existingCard.rblNumber && existingCard.line && existingCard.direction) {
                        this.currentCardConfig.departureLines = [{
                            id: 'legacy-1',
                            rbl: existingCard.rblNumber,
                            line: existingCard.line,
                            direction: existingCard.direction,
                            departureCount: existingCard.departureCount || 3
                        }];
                    } else {
                        this.currentCardConfig.departureLines = [];
                    }
                    
                    // Set station input field
                    const cardStation = document.getElementById('cardStation');
                    if (cardStation) cardStation.value = foundStation.name || foundStation.title;
                    
                    // Show departures config section and populate it
                    this.showDepartureConfigSection(foundStation);
                    this.renderDepartureLinesList();
                    this.updateCardPreview();
                } else {
                    console.warn(`Could not find station data for: ${existingCard.stationName}`);
                    // Fallback: just set the station name
                    const cardStation = document.getElementById('cardStation');
                    if (cardStation) cardStation.value = existingCard.stationName;
                }
            }
        }
        
        // Load existing card data if editing
        if (existingCard && this.loadExistingCardData) {
            this.loadExistingCardData(existingCard);
        }
        
        // Show modal
        document.getElementById('cardConfigModal').style.display = 'block';
    }

    setupCardConfigModal() {
        const form = document.getElementById('cardConfigForm');
        const stationInput = document.getElementById('cardStation');
        const stationResults = document.getElementById('cardStationResults');
        const addDepartureLineBtn = document.getElementById('addDepartureLineBtn');
        
        // Initialize empty departure lines array
        this.currentCardConfig = {
            station: null,
            departureLines: [],
            title: '',
            refreshInterval: 15,
            autoSort: true,
            maxDepartureRows: 9  // Default: 9 Zeilen
        };
        
        // Initialize station lines map
        this.currentStationLines = new Map();
        
        // Station search
        stationInput.oninput = (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                if (stationResults) stationResults.style.display = 'none';
                this.updateCardPreview();
                return;
            }
            
            // Search in loaded station data
            const filteredStations = this.searchStations(query);
            
            if (filteredStations.length > 0 && stationResults) {
                stationResults.innerHTML = filteredStations.map(station => `
                    <div class="station-result-item" onclick="app.selectCardStation('${station.diva || station.name}')">
                        <div class="station-name">${station.name}</div>
                        <div class="station-info">${station.rbl_count > 0 ? station.rbl_count + ' RBL-Nummern' : 'Keine RBL verfügbar'} • ${station.municipality || 'Wien'}</div>
                    </div>
                `).join('');
                stationResults.style.display = 'block';
            } else if (stationResults) {
                // If no stations found, show manual RBL input option
                stationResults.innerHTML = `
                    <div class="station-result-item" onclick="app.selectManualRBL('${query}')">
                        <div class="station-name">Direkte RBL-Eingabe: ${query}</div>
                        <div class="station-info">Verwende "${query}" als RBL-Nummer</div>
                    </div>
                `;
                stationResults.style.display = 'block';
            }
        };
        
        // Helper function to load existing card data properly
        this.loadExistingCardData = (existingCard) => {
            if (!existingCard) return;
            
            // Load station and departure lines for editing
            if (existingCard.station && existingCard.departureLines) {
                // New format - complete data available
                this.currentCardConfig.station = existingCard.station;
                this.currentCardConfig.departureLines = [...existingCard.departureLines];
                
                // Set station input and trigger station selection
                const cardStation = document.getElementById('cardStation');
                if (cardStation) {
                    cardStation.value = existingCard.station.name || existingCard.station.title;
                }
                
                // Show departures config section
                this.showDepartureConfigSection(existingCard.station);
                
                // Render existing departure lines
                this.renderDepartureLinesList();
                
            } else if (existingCard.stationName) {
                // Legacy format - try to find station
                const foundStation = this.stations.find(s => 
                    s.name === existingCard.stationName || 
                    s.title === existingCard.stationName
                );
                
                if (foundStation) {
                    // Convert to new format
                    this.currentCardConfig.station = foundStation;
                    
                    if (existingCard.rblNumber && existingCard.line && existingCard.direction) {
                        this.currentCardConfig.departureLines = [{
                            id: `legacy-${Date.now()}`,
                            rbl: existingCard.rblNumber,
                            line: existingCard.line,
                            direction: existingCard.direction,
                            departureCount: existingCard.departureCount || 3
                        }];
                    }
                    
                    // Set station input and show config
                    const cardStation = document.getElementById('cardStation');
                    if (cardStation) {
                        cardStation.value = foundStation.name || foundStation.title;
                    }
                    
                    this.showDepartureConfigSection(foundStation);
                    this.renderDepartureLinesList();
                } else {
                    console.warn(`Station not found: ${existingCard.stationName}`);
                }
            }
            
            // Load other settings
            this.currentCardConfig.title = existingCard.title || '';
            this.currentCardConfig.refreshInterval = existingCard.refreshInterval || 15;
            this.currentCardConfig.autoSort = existingCard.autoSort !== false;
            this.currentCardConfig.maxDepartureRows = existingCard.maxDepartureRows || 9;
            
            // Set form values
            this.setFormValues();
            
            // Update preview and save button
            this.updateCardPreview();
            this.updateSaveButton();
        };
        
        // Add departure line button
        if (addDepartureLineBtn) {
            addDepartureLineBtn.onclick = () => {
                this.addDepartureLineConfig();
            };
        }
        
        // Add departure line button
        if (addDepartureLineBtn) {
            addDepartureLineBtn.onclick = () => {
                this.addDepartureLineConfig();
            };
        }
        
        // Card settings change handlers
        document.getElementById('cardTitle').oninput = (e) => {
            this.currentCardConfig.title = e.target.value;
            this.updateCardPreview();
            this.updateSaveButton();
        };
        
        document.getElementById('cardRefreshInterval').onchange = (e) => {
            this.currentCardConfig.refreshInterval = parseInt(e.target.value);
            this.updateCardPreview();
            this.updateSaveButton();
        };
        
        document.getElementById('autoSortDepartures').onchange = (e) => {
            this.currentCardConfig.autoSort = e.target.checked;
            this.updateCardPreview();
            this.updateSaveButton();
        };
        
        // Max departure rows setting
        document.getElementById('maxDepartureRows').oninput = (e) => {
            this.currentCardConfig.maxDepartureRows = parseInt(e.target.value);
            document.getElementById('maxDepartureRowsValue').textContent = `${e.target.value} Zeilen`;
            this.updateCardPreview();
            this.updateSaveButton();
        };
        
        // Form submission
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.saveMultiLineCardConfig();
            };
        }
    }

    async saveMultiLineCardConfig() {
        if (!this.currentCardConfig.station) {
            alert('Bitte wählen Sie eine Station aus.');
            return;
        }
        
        if (this.currentCardConfig.departureLines.length === 0) {
            alert('Bitte fügen Sie mindestens eine Abfahrtslinie hinzu.');
            return;
        }
        
        // Check line limits for non-authenticated users
        if (!this.auth.isLoggedIn && this.currentCardConfig.departureLines.length > 5) {
            this.showNotification('Ohne Anmeldung sind maximal 5 Abfahrtslinien pro Karte erlaubt. Bitte registrieren Sie sich für unbegrenzte Linien.', 'warning');
            return;
        }
        
        // Build complete cardData
        const cardData = {
            id: this.currentEditingCard ? this.currentEditingCard.id : Date.now().toString(),
            title: this.currentCardConfig.title || this.currentCardConfig.station.name,
            stationName: this.currentCardConfig.station.name,
            station: this.currentCardConfig.station,
            departureLines: this.currentCardConfig.departureLines,
            refreshInterval: this.currentCardConfig.refreshInterval,
            autoSort: this.currentCardConfig.autoSort,
            maxDepartureRows: this.currentCardConfig.maxDepartureRows,
            // RBL mapping for live API
            rblNumbers: this.currentCardConfig.station.rbls?.map(r => r.stopId || r.rbl).filter(Boolean) || [],
            // Legacy fields for compatibility
            rblNumber: this.currentCardConfig.station.rbls?.[0]?.stopId || this.currentCardConfig.station.rbls?.[0]?.rbl,
            latitude: this.currentCardConfig.station.latitude,
            longitude: this.currentCardConfig.station.longitude
        };
        
        console.log(`💾 Saving multi-line card:`, cardData);
        
        let cards = await this.loadDashboardCards();
        
        if (this.currentEditingCard) {
            // Update existing card
            const index = cards.findIndex(c => c.id === this.currentEditingCard.id);
            if (index !== -1) {
                cards[index] = cardData;
                console.log(`✏️ Updated existing card at index ${index}`);
            } else {
                console.warn('⚠️ Card to update not found, adding as new');
                cards.push(cardData);
            }
        } else {
            // Add new card
            cards.push(cardData);
            console.log(`➕ Added new card`);
        }
        
        await this.saveDashboardCards(cards);
        this.closeCardConfig();
        await this.loadDashboard();
    }

    setFormValues() {
        // Set form values based on currentCardConfig
        document.getElementById('cardTitle').value = this.currentCardConfig.title;
        document.getElementById('cardRefreshInterval').value = this.currentCardConfig.refreshInterval;
        document.getElementById('autoSortDepartures').checked = this.currentCardConfig.autoSort;
        document.getElementById('maxDepartureRows').value = this.currentCardConfig.maxDepartureRows;
        document.getElementById('maxDepartureRowsValue').textContent = `${this.currentCardConfig.maxDepartureRows} Zeilen`;
    }

    searchStations(query) {
        console.log('🔍 Searching stations for:', query);
        
        if (!this.stations || !Array.isArray(this.stations)) {
            console.warn('No stations data available for search', this.stations);
            return [];
        }
        
        console.log(`Total stations available: ${this.stations.length}`);
        
        const filteredStations = this.stations.filter(station => {
            const nameMatch = station.name && station.name.toLowerCase().includes(query.toLowerCase());
            const titleMatch = station.title && station.title.toLowerCase().includes(query.toLowerCase());
            return nameMatch || titleMatch;
        }).slice(0, 8);
        
        console.log(`🔍 Found ${filteredStations.length} stations for query: "${query}"`);
        if (filteredStations.length > 0) {
            console.log('First match:', filteredStations[0]);
        }
        return filteredStations;
    }

    selectCardStation(identifier) {
        // Find station by diva ID or name
        const station = this.stations.find(s => 
            s.diva === identifier || 
            s.name === identifier ||
            s.title === identifier
        );
        
        if (!station) {
            console.warn(`Station not found: ${identifier}`);
            return;
        }
        
        console.log(`📍 Selected station: ${station.name}`, station);
        
        const cardStation = document.getElementById('cardStation');
        const cardStationData = document.getElementById('cardStationData');
        const cardStationResults = document.getElementById('cardStationResults');
        
        if (cardStation) cardStation.value = station.name || station.title;
        if (cardStationData) cardStationData.value = JSON.stringify(station);
        if (cardStationResults) cardStationResults.style.display = 'none';
        
        // Store selected station in config
        this.currentCardConfig.station = station;
        this.selectedStation = station;
        
        // Auto-fill title if empty
        const titleInput = document.getElementById('cardTitle');
        if (titleInput && !titleInput.value) {
            titleInput.value = station.name || station.title;
            this.currentCardConfig.title = station.name || station.title;
        }
        
        // Show departure configuration section
        this.showDepartureConfigSection(station);
        
        // Add default departure line
        if (this.currentCardConfig.departureLines.length === 0) {
            this.addDepartureLineConfig();
        }
        
        // Update preview
        this.updateCardPreview();
    }

    selectManualRBL(rblNumber) {
        console.log(`🔢 Manual RBL selection: ${rblNumber}`);
        
        // Create a synthetic station object
        const syntheticStation = {
            name: `RBL ${rblNumber}`,
            title: `RBL ${rblNumber}`,
            diva: `manual_${rblNumber}`,
            municipality: 'Wien',
            rbl_count: 1,
            rbls: [rblNumber]
        };
        
        const cardStation = document.getElementById('cardStation');
        const cardStationData = document.getElementById('cardStationData');
        const cardStationResults = document.getElementById('cardStationResults');
        
        if (cardStation) cardStation.value = `RBL ${rblNumber}`;
        if (cardStationData) cardStationData.value = JSON.stringify(syntheticStation);
        if (cardStationResults) cardStationResults.style.display = 'none';
        
        // Store selected station
        this.selectedStation = syntheticStation;
        
        // Auto-fill title if empty
        const titleInput = document.getElementById('cardTitle');
        if (titleInput && !titleInput.value) {
            titleInput.value = `RBL ${rblNumber}`;
        }
        
        // Show line selection for all RBLs at this station
        this.showLinesForStation(syntheticStation);
    }

    async showLinesForStation(station) {
        const lineDirectionSection = document.getElementById('lineDirectionSection');
        const rblSelect = document.getElementById('cardRblSelect');
        const lineSelect = document.getElementById('cardLineSelect');
        
        if (!lineDirectionSection || !rblSelect || !lineSelect) {
            console.warn('Line selection elements not found');
            return;
        }
        
        console.log(`🚉 Loading all lines for station: ${station.name}`);
        
        // Show section
        lineDirectionSection.style.display = 'block';
        
        // Hide RBL selection since we'll use all RBLs
        const rblGroup = rblSelect.closest('.form-group');
        if (rblGroup) rblGroup.style.display = 'none';
        
        // Store all RBL numbers for this station
        const allRbls = station.rbls || [];
        
        if (allRbls.length === 0) {
            lineSelect.innerHTML = '<option value="">Keine RBL-Nummern für diese Station verfügbar</option>';
            return;
        }
        
        try {
            lineSelect.innerHTML = '<option value="">Lade alle Linien...</option>';
            
            // Collect lines from all RBLs at this station
            const allLinesMap = new Map();
            
            for (const rbl of allRbls) {
                console.log(`🔍 Loading lines for RBL: ${rbl}`);
                
                try {
                    const departures = await this.fetchDeparturesForRBL(rbl);
                    
                    if (departures && departures.length > 0) {
                        departures.forEach(dep => {
                            const key = dep.line;
                            if (!allLinesMap.has(key)) {
                                allLinesMap.set(key, {
                                    line: dep.line,
                                    lineId: dep.lineId,
                                    destinations: new Set(),
                                    rbls: new Set()
                                });
                            }
                            
                            const lineInfo = allLinesMap.get(key);
                            if (dep.towards && dep.towards.trim() !== '') {
                                lineInfo.destinations.add(dep.towards.trim());
                            }
                            lineInfo.rbls.add(rbl);
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load data for RBL ${rbl}:`, error);
                }
            }
            
            console.log(`� Found lines across all RBLs:`, Array.from(allLinesMap.entries()).map(([line, info]) => ({
                line,
                destinations: Array.from(info.destinations),
                rbls: Array.from(info.rbls)
            })));
            
            // Populate line dropdown with all available lines
            lineSelect.innerHTML = '<option value="">Linie auswählen...</option>';
            
            if (allLinesMap.size > 0) {
                // Sort lines numerically/alphabetically
                const sortedLines = Array.from(allLinesMap.entries()).sort(([a], [b]) => {
                    // Try to sort numerically first, then alphabetically
                    const numA = parseInt(a);
                    const numB = parseInt(b);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    return a.localeCompare(b);
                });
                
                for (const [lineKey, lineInfo] of sortedLines) {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({
                        line: lineInfo.line,
                        lineId: lineInfo.lineId,
                        destinations: Array.from(lineInfo.destinations),
                        rbls: Array.from(lineInfo.rbls),
                        stationRbls: allRbls // Store all station RBLs for filtering
                    });
                    const destCount = lineInfo.destinations.size;
                    const rblCount = lineInfo.rbls.size;
                    option.textContent = `${lineInfo.line} (${destCount} ${destCount === 1 ? 'Richtung' : 'Richtungen'}, ${rblCount} ${rblCount === 1 ? 'Steig' : 'Steige'})`;
                    lineSelect.appendChild(option);
                }
                
                // Setup line selection handler
                lineSelect.onchange = () => {
                    if (lineSelect.value) {
                        const lineData = JSON.parse(lineSelect.value);
                        this.loadDestinationsForLine(lineData);
                    } else {
                        this.clearDirectionSelection();
                    }
                };
                
                console.log(`✅ Loaded ${allLinesMap.size} lines from ${allRbls.length} RBLs`);
            } else {
                lineSelect.innerHTML = '<option value="">Keine Linien an dieser Station gefunden</option>';
            }
            
        } catch (error) {
            console.error('Error loading lines for station:', error);
            lineSelect.innerHTML = '<option value="">Fehler beim Laden der Linien</option>';
        }
    }

    hideLineDirectionSelection() {
        const lineDirectionSection = document.getElementById('lineDirectionSection');
        if (lineDirectionSection) {
            lineDirectionSection.style.display = 'none';
        }
    }

    async showLineDirectionSelection() {
        const lineDirectionSection = document.getElementById('lineDirectionSection');
        
        if (!lineDirectionSection) {
            console.warn('Line direction section not found');
            return;
        }
        
        // Show the section
        lineDirectionSection.style.display = 'block';
        
        console.log('📋 Line/Direction selection section is now visible');
    }

    async loadLinesForRBL(rbl) {
        const lineSelect = document.getElementById('cardLineSelect');
        lineSelect.innerHTML = '<option value="">Lade Linien...</option>';
        
        try {
            console.log(`🔍 Loading lines for RBL: ${rbl}`);
            
            // Get current departures to see available lines
            const departures = await this.fetchDeparturesForRBL(rbl);
            
            if (departures && departures.length > 0) {
                // Extract unique lines with their actual destination stations
                const linesMap = new Map();
                departures.forEach(dep => {
                    const key = dep.line;
                    if (!linesMap.has(key)) {
                        linesMap.set(key, {
                            line: dep.line,
                            lineId: dep.lineId,
                            destinations: new Set()
                        });
                    }
                    // Store the destination/towards field which should be the end station
                    if (dep.towards && dep.towards.trim() !== '') {
                        linesMap.get(key).destinations.add(dep.towards.trim());
                    }
                });
                
                console.log(`🚌 Found lines with destinations:`, Array.from(linesMap.entries()).map(([line, info]) => ({
                    line,
                    destinations: Array.from(info.destinations)
                })));
                
                // Populate line dropdown
                lineSelect.innerHTML = '<option value="">Linie auswählen...</option>';
                for (const [lineKey, lineInfo] of linesMap) {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({
                        line: lineInfo.line,
                        lineId: lineInfo.lineId,
                        destinations: Array.from(lineInfo.destinations)
                    });
                    const destCount = lineInfo.destinations.size;
                    option.textContent = `${lineInfo.line} (${destCount} ${destCount === 1 ? 'Richtung' : 'Richtungen'})`;
                    lineSelect.appendChild(option);
                }
                
                // Setup line selection handler
                lineSelect.onchange = () => {
                    if (lineSelect.value) {
                        const lineData = JSON.parse(lineSelect.value);
                        this.loadDestinationsForLine(lineData);
                    } else {
                        this.clearDirectionSelection();
                    }
                };
            } else {
                lineSelect.innerHTML = '<option value="">Keine Linien gefunden</option>';
            }
        } catch (error) {
            console.error('Error loading lines for RBL:', error);
            lineSelect.innerHTML = '<option value="">Fehler beim Laden</option>';
        }
    }

    loadDestinationsForLine(lineData) {
        const directionSelect = document.getElementById('cardDirectionSelect');
        
        console.log(`🎯 Loading destinations for line ${lineData.line}:`, lineData.destinations);
        
        directionSelect.innerHTML = '<option value="">Endstation/Richtung auswählen...</option>';
        
        // Sort destinations alphabetically for better UX
        const sortedDestinations = lineData.destinations.sort();
        
        sortedDestinations.forEach(destination => {
            const option = document.createElement('option');
            option.value = destination;
            option.textContent = `→ ${destination}`;
            directionSelect.appendChild(option);
        });
        
        console.log(`✅ Loaded ${sortedDestinations.length} destinations for line ${lineData.line}`);
    }

    // Keep the old method name for compatibility
    loadDirectionsForLine(lineData) {
        // Redirect to the new method
        if (lineData.destinations) {
            this.loadDestinationsForLine(lineData);
        } else if (lineData.directions) {
            // Handle old format
            this.loadDestinationsForLine({
                ...lineData,
                destinations: lineData.directions
            });
        }
    }

    clearLineSelection() {
        document.getElementById('cardLineSelect').innerHTML = '<option value="">Bitte RBL zuerst auswählen</option>';
        this.clearDirectionSelection();
    }

    clearDirectionSelection() {
        document.getElementById('cardDirectionSelect').innerHTML = '<option value="">Bitte Linie zuerst auswählen</option>';
    }

    // New methods for modernized card config modal

    showDepartureConfigSection(station) {
        const departuresConfig = document.getElementById('departuresConfig');
        if (departuresConfig) {
            departuresConfig.style.display = 'block';
        }
        
        // Load available lines for this station
        this.loadStationLines(station);
    }

    async loadStationLines(station) {
        try {
            console.log(`🚉 Loading lines for station: ${station.name}`);
            
            // Get all RBLs for this station
            const allRBLs = station.rbls || [];
            this.currentStationLines = new Map();
            
            // Load lines for each RBL
            for (const rbl of allRBLs) {
                try {
                    // Convert RBL to integer (remove decimal places)
                    const rblNumber = Math.floor(parseFloat(rbl));
                    const response = await fetch(`/api/departures/${rblNumber}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.data && data.data.monitors) {
                            data.data.monitors.forEach(monitor => {
                                const lineKey = `${monitor.locationStop.properties.attributes.rbl}_${monitor.lines[0]?.name}_${monitor.lines[0]?.towards}`;
                                this.currentStationLines.set(lineKey, {
                                    rbl: rblNumber,
                                    line: monitor.lines[0]?.name || 'Unknown',
                                    direction: monitor.lines[0]?.towards || 'Unknown',
                                    lineData: monitor.lines[0]
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load RBL ${rbl}:`, error);
                }
            }
            
            console.log(`📊 Loaded ${this.currentStationLines.size} unique line-direction combinations`);
            
            // Re-render departure lines list to update dropdowns
            this.renderDepartureLinesList();
        } catch (error) {
            console.error('Error loading station lines:', error);
        }
    }

    addDepartureLineConfig() {
        if (!this.currentCardConfig.station) {
            alert('Bitte wählen Sie zuerst eine Station aus.');
            return;
        }
        
        const departureLineId = `departure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const departureLineConfig = {
            id: departureLineId,
            line: '',
            direction: '',
            rbl: '',
            departureCount: 2,
            enableCycling: true  // Default: Durchschalten aktiviert
        };
        
        this.currentCardConfig.departureLines.push(departureLineConfig);
        this.renderDepartureLinesList();
        this.updateCardPreview();
        this.updateSaveButton();
    }

    renderDepartureLinesList() {
        const departureLinesList = document.getElementById('departureLinesList');
        const departureLinesEmpty = document.getElementById('departureLinesEmpty');
        
        if (!departureLinesList) return;
        
        if (this.currentCardConfig.departureLines.length === 0) {
            departureLinesList.innerHTML = '';
            if (departureLinesEmpty) departureLinesEmpty.style.display = 'block';
            return;
        }
        
        if (departureLinesEmpty) departureLinesEmpty.style.display = 'none';
        
        departureLinesList.innerHTML = this.currentCardConfig.departureLines.map((config, index) => `
            <div class="departure-line-config" data-id="${config.id}" draggable="true">
                <div class="departure-line-header">
                    <div class="departure-line-title">
                        <i class="fas fa-grip-vertical drag-handle"></i>
                        <span>Abfahrtslinie ${index + 1}</span>
                    </div>
                    <div class="departure-line-controls">
                        <button type="button" class="remove-line-btn" onclick="app.removeDepartureLineConfig('${config.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="line-direction-selector">
                    <div class="form-group">
                        <label>Linie</label>
                        <select class="form-control line-selector" data-id="${config.id}">
                            <option value="">Linie wählen...</option>
                            ${this.getAvailableLines().map(line => `
                                <option value="${line}" ${config.line === line ? 'selected' : ''}>${line}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Richtung</label>
                        <select class="form-control direction-selector" data-id="${config.id}">
                            <option value="">Richtung wählen...</option>
                            ${config.line ? this.getAvailableDirections(config.line).map(direction => `
                                <option value="${direction}" ${config.direction === direction ? 'selected' : ''}>${direction}</option>
                            `).join('') : ''}
                        </select>
                    </div>
                </div>
                
                <div class="departure-count-selector">
                    <label>${config.enableCycling ? 'Anzahl durchgeschaltete Abfahrten:' : 'Anzahl Abfahrten:'}</label>
                    <div class="departure-count-buttons">
                        ${[1, 2, 3].map(count => `
                            <button type="button" class="count-btn ${config.departureCount === count ? 'active' : ''}" 
                                    onclick="app.updateDepartureCount('${config.id}', ${count})">${count}</button>
                        `).join('')}
                    </div>
                </div>
                
                ${config.enableCycling ? `
                <div class="cycling-interval-selector">
                    <label for="cyclingInterval_${config.id}">Durchschalt-Intervall: <span id="intervalValue_${config.id}">${config.cyclingInterval || 5}</span>s</label>
                    <input type="range" id="cyclingInterval_${config.id}" class="form-range" 
                           min="1" max="30" value="${config.cyclingInterval || 5}"
                           oninput="app.updateCyclingInterval('${config.id}', this.value)">
                </div>
                ` : ''}
                
                <div class="departure-line-options">
                    <div class="form-check">
                        <input type="checkbox" id="enableCycling_${config.id}" class="form-check-input" 
                               ${config.enableCycling ? 'checked' : ''} 
                               onchange="app.updateLineCyclingMode('${config.id}', this.checked)">
                        <label for="enableCycling_${config.id}" class="form-check-label">
                            Durchschalten der Abfahrtszeiten aktivieren
                        </label>
                        <small class="form-text">Wenn deaktiviert, werden alle Abfahrten dieser Linie permanent angezeigt</small>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Setup event listeners for selectors
        this.setupDepartureLineEventListeners();
        this.setupDragAndDrop();
    }

    getAvailableLines() {
        if (!this.currentStationLines) return [];
        const lines = new Set();
        this.currentStationLines.forEach(lineData => {
            lines.add(lineData.line);
        });
        return Array.from(lines).sort();
    }

    getAvailableDirections(selectedLine) {
        if (!this.currentStationLines || !selectedLine) return [];
        const directions = new Set();
        this.currentStationLines.forEach(lineData => {
            if (lineData.line === selectedLine) {
                directions.add(lineData.direction);
            }
        });
        return Array.from(directions).sort();
    }

    setupDepartureLineEventListeners() {
        // Line selectors
        document.querySelectorAll('.line-selector').forEach(select => {
            select.onchange = (e) => {
                const configId = e.target.dataset.id;
                const selectedLine = e.target.value;
                this.updateDepartureLineConfig(configId, 'line', selectedLine);
                
                // Update direction selector
                const directionSelect = document.querySelector(`.direction-selector[data-id="${configId}"]`);
                if (directionSelect) {
                    directionSelect.innerHTML = `
                        <option value="">Richtung wählen...</option>
                        ${this.getAvailableDirections(selectedLine).map(direction => `
                            <option value="${direction}">${direction}</option>
                        `).join('')}
                    `;
                }
            };
        });
        
        // Direction selectors
        document.querySelectorAll('.direction-selector').forEach(select => {
            select.onchange = (e) => {
                const configId = e.target.dataset.id;
                const selectedDirection = e.target.value;
                this.updateDepartureLineConfig(configId, 'direction', selectedDirection);
            };
        });
    }

    updateDepartureLineConfig(configId, field, value) {
        const config = this.currentCardConfig.departureLines.find(c => c.id === configId);
        if (config) {
            config[field] = value;
            
            // Find matching RBL for line+direction combination
            if (field === 'direction' && config.line && config.direction) {
                for (const [key, lineData] of this.currentStationLines) {
                    if (lineData.line === config.line && lineData.direction === config.direction) {
                        config.rbl = lineData.rbl;
                        break;
                    }
                }
            }
            
            this.updateCardPreview();
            this.updateSaveButton();
        }
    }

    updateDepartureCount(configId, count) {
        const config = this.currentCardConfig.departureLines.find(c => c.id === configId);
        if (config) {
            config.departureCount = count;
            this.renderDepartureLinesList();
            this.updateCardPreview();
            this.updateSaveButton();
        }
    }

    updateLineCyclingMode(configId, enabled) {
        const config = this.currentCardConfig.departureLines.find(c => c.id === configId);
        if (config) {
            config.enableCycling = enabled;
            if (enabled && !config.cyclingInterval) {
                config.cyclingInterval = 5; // Default interval
            }
            this.renderDepartureLinesList(); // Re-render to show/hide interval slider
            this.updateCardPreview();
            this.updateSaveButton();
        }
    }

    updateCyclingInterval(configId, interval) {
        const config = this.currentCardConfig.departureLines.find(c => c.id === configId);
        if (config) {
            config.cyclingInterval = parseInt(interval);
            document.getElementById(`intervalValue_${configId}`).textContent = interval;
            this.updateSaveButton();
        }
    }

    removeDepartureLineConfig(configId) {
        this.currentCardConfig.departureLines = this.currentCardConfig.departureLines.filter(c => c.id !== configId);
        this.renderDepartureLinesList();
        this.updateCardPreview();
        this.updateSaveButton();
    }

    setupDragAndDrop() {
        const departureLinesList = document.getElementById('departureLinesList');
        if (!departureLinesList) return;
        
        new Sortable(departureLinesList, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'dragging',
            onEnd: (evt) => {
                // Reorder the departureLines array
                const movedItem = this.currentCardConfig.departureLines.splice(evt.oldIndex, 1)[0];
                this.currentCardConfig.departureLines.splice(evt.newIndex, 0, movedItem);
                this.renderDepartureLinesList();
                this.updateCardPreview();
            }
        });
    }

    updateCardPreview() {
        const previewTitle = document.getElementById('previewTitle');
        const previewContent = document.getElementById('previewContent');
        const previewFooter = document.getElementById('previewFooter');
        const previewFooterInfo = document.getElementById('previewFooterInfo');
        const cardPreview = document.getElementById('cardPreview');
        
        if (!previewTitle || !previewContent) return;
        
        // Update title
        previewTitle.textContent = this.currentCardConfig.title || 'Neue Karte';
        
        // Update content
        if (!this.currentCardConfig.station) {
            previewContent.innerHTML = `
                <div class="card-empty">
                    <i class="fas fa-map-marker-alt"></i>
                    <h4>Station auswählen</h4>
                    <p>Wählen Sie zuerst eine Station aus</p>
                </div>
            `;
            if (previewFooter) previewFooter.style.display = 'none';
            return;
        }
        
        if (this.currentCardConfig.departureLines.length === 0) {
            previewContent.innerHTML = `
                <div class="card-empty">
                    <i class="fas fa-route"></i>
                    <h4>Abfahrtszeilen hinzufügen</h4>
                    <p>Fügen Sie Linien und Richtungen hinzu</p>
                </div>
            `;
            if (previewFooter) previewFooter.style.display = 'none';
            return;
        }
        
        // Show configured departure lines with improved preview
        const validLines = this.currentCardConfig.departureLines.filter(line => line.line && line.direction);
        
        if (validLines.length === 0) {
            previewContent.innerHTML = `
                <div class="card-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Konfiguration unvollständig</h4>
                    <p>Wählen Sie Linien und Richtungen aus</p>
                </div>
            `;
            if (previewFooter) previewFooter.style.display = 'none';
            return;
        }
        
        // Generate preview departures based on configuration
        const maxRows = this.currentCardConfig.maxDepartureRows || 9;
        const staticLines = validLines.filter(line => !line.enableCycling);
        const cyclingLines = validLines.filter(line => line.enableCycling);
        
        let previewItems = [];
        let usedRows = 0;
        
        // Static lines first
        staticLines.forEach(line => {
            const departureCount = line.departureCount || 3;
            for (let i = 0; i < departureCount && usedRows < maxRows; i++) {
                previewItems.push({
                    line: line,
                    isStatic: true,
                    departureIndex: i
                });
                usedRows++;
            }
        });
        
        // Cycling lines (limited to remaining space)
        if (cyclingLines.length > 0 && usedRows < maxRows) {
            const remainingRows = maxRows - usedRows;
            let cyclingIndex = 0;
            
            for (let i = 0; i < remainingRows; i++) {
                if (cyclingLines.length > 0) {
                    const line = cyclingLines[cyclingIndex % cyclingLines.length];
                    previewItems.push({
                        line: line,
                        isStatic: false,
                        departureIndex: Math.floor(cyclingIndex / cyclingLines.length)
                    });
                    cyclingIndex++;
                }
            }
        }
        
        previewContent.innerHTML = `
            <div class="departures-list">
                ${previewItems.map((item, index) => {
                    const minutes = 2 + (index * 3) + (item.departureIndex * 5); // Simulate departure times
                    const badgeClass = this.getLineBadgeClass(item.line.line, 'tram'); // Default to tram for preview
                    return `
                        <div class="departure-item preview-departure-item ${item.isStatic ? 'static-departure' : 'cycling-departure'}" data-line-id="${item.line.id}">
                            <div class="line-info">
                                <span class="line-badge line-tram ${badgeClass}">${item.line.line}</span>
                                <span class="direction">${item.line.direction}</span>
                            </div>
                            <div class="departure-time">
                                <span class="countdown">${minutes} Min</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Show footer with enhanced configuration info
        if (previewFooter && previewFooterInfo) {
            previewFooter.style.display = 'flex';
            const displayModeText = this.currentCardConfig.displayMode === 'cycling' 
                ? `Durchschalten (${this.currentCardConfig.cycleDuration}s)`
                : 'Alle gleichzeitig';
            const sortText = this.currentCardConfig.autoSort ? 'Sortiert' : 'Unsortiert';
            const refreshText = `${this.currentCardConfig.refreshInterval}s Refresh`;
            
            const staticCount = staticLines.length;
            const cyclingCount = cyclingLines.length;
            let configInfo = '';
            
            if (staticCount > 0 && cyclingCount > 0) {
                configInfo = `${staticCount} fest, ${cyclingCount} durchschaltend`;
            } else if (staticCount > 0) {
                configInfo = `${staticCount} Linien fest`;
            } else {
                configInfo = `${cyclingCount} Linien durchschaltend`;
            }
            
            previewFooterInfo.textContent = `${this.currentCardConfig.station.name} • ${validLines.length} Linie${validLines.length !== 1 ? 'n' : ''} • ${configInfo} • Max ${maxRows} Zeilen • ${refreshText}`;
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('saveCardBtn');
        if (!saveBtn) return;
        
        const hasStation = !!this.currentCardConfig.station;
        const hasValidLines = this.currentCardConfig.departureLines.some(line => line.line && line.direction);
        const canSave = hasStation && hasValidLines;
        
        saveBtn.disabled = !canSave;
        
        // Different text for editing vs. creating
        const isEditing = !!this.currentEditingCard;
        if (canSave) {
            saveBtn.innerHTML = isEditing 
                ? '<i class="fas fa-save"></i> Änderungen speichern'
                : '<i class="fas fa-save"></i> Karte speichern';
        } else {
            saveBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Konfiguration unvollständig';
        }
    }

    async saveNewCardConfig() {
        if (!this.currentCardConfig.station) {
            alert('Bitte wählen Sie eine Station aus.');
            return;
        }
        
        const validLines = this.currentCardConfig.departureLines.filter(line => line.line && line.direction && line.rbl);
        
        if (validLines.length === 0) {
            alert('Bitte konfigurieren Sie mindestens eine Abfahrtslinie.');
            return;
        }
        
        // Create card data object
        const cardData = {
            id: await this.generateUniqueCardId(),
            title: this.currentCardConfig.title || this.currentCardConfig.station.name,
            station: this.currentCardConfig.station,
            stationName: this.currentCardConfig.station.name, // Add explicit stationName
            departureLines: validLines,
            refreshInterval: this.currentCardConfig.refreshInterval,
            displayMode: this.currentCardConfig.displayMode,
            cycleDuration: this.currentCardConfig.cycleDuration,
            autoSort: this.currentCardConfig.autoSort,
            position: this.getNextCardPosition()
        };
        
        // Save card to dashboard
        this.dashboardCards = await this.loadDashboardCards(); // Load existing cards first
        console.log(`📋 Loaded ${this.dashboardCards.length} existing cards before adding new one`);
        this.dashboardCards.push(cardData);
        console.log(`📋 Total cards after adding new one: ${this.dashboardCards.length}`);
        await this.saveDashboardCards();
        
        // Reload the entire dashboard to show all cards
        await this.loadDashboard();
        
        // Close modal and show success
        this.closeCardConfig();
        alert('✅ Dashboard-Karte wurde erfolgreich erstellt!');
    }

    async editDashboardCard(cardId) {
        const cards = await this.loadDashboardCards();
        const card = cards.find(c => c.id === cardId);
        
        if (!card) {
            console.error(`Card not found: ${cardId}`);
            return;
        }
        
        // Load the card configuration into the modal for editing
        this.addDashboardCard(card);
    }

    async generateUniqueCardId() {
        // Generate a unique ID using timestamp and random number
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const id = `${timestamp}-${random}`;
        
        // Ensure the ID is unique by checking existing cards
        const existingCards = await this.loadDashboardCards();
        const existingIds = existingCards.map(card => card.id);
        
        if (existingIds.includes(id)) {
            // If by some chance there's a collision, recursively try again
            return await this.generateUniqueCardId();
        }
        
        return id;
    }

    getNextCardPosition() {
        const grid = document.querySelector('.dashboard-grid');
        if (!grid) return { x: 0, y: 0 };
        
        const existingCards = Array.from(grid.children);
        return {
            x: 0,
            y: existingCards.length
        };
    }

    async saveDashboardCards(cards = null) {
        try {
            const cardsToSave = cards || this.dashboardCards;
            console.log(`💾 Saving ${cardsToSave.length} dashboard cards:`, cardsToSave);
            
            // Save to Supabase if authenticated, otherwise to localStorage
            if (this.auth && this.auth.isLoggedIn && this.userDataManager) {
                const result = await this.userDataManager.saveUserDashboardCards(cardsToSave);
                if (result.success) {
                    console.log(`✅ Successfully saved dashboard cards to Supabase`);
                } else {
                    console.error('❌ Failed to save to Supabase, falling back to localStorage');
                    localStorage.setItem('wien_opnv_dashboard_cards', JSON.stringify(cardsToSave));
                }
            } else {
                localStorage.setItem('wien_opnv_dashboard_cards', JSON.stringify(cardsToSave));
                console.log(`✅ Successfully saved dashboard cards to localStorage`);
            }
            
            console.log('📋 Saved order:', cardsToSave.map((c, index) => `${index + 1}. ${c.title}`));
            
            // Update instance property if cards were passed
            if (cards) {
                this.dashboardCards = cards;
            }
        } catch (error) {
            console.error('Error saving dashboard cards:', error);
        }
    }

    async loadDashboardCards() {
        try {
            let cards = [];
            
            // Load from Supabase if authenticated, otherwise from localStorage
            if (this.auth && this.auth.isLoggedIn && this.userDataManager) {
                // First check if there are any local cards that need migration
                const localCards = localStorage.getItem('wien_opnv_dashboard_cards');
                if (localCards && localCards !== '[]') {
                    console.log('🔄 Local cards found, checking if migration is needed...');
                    const localCardsArray = JSON.parse(localCards);
                    
                    // Check if user already has cards in Supabase
                    const supabaseCards = await this.userDataManager.loadUserDashboardCards();
                    
                    if (supabaseCards.length === 0 && localCardsArray.length > 0) {
                        console.log('🚀 Migrating local cards to Supabase...');
                        const migrationResult = await this.userDataManager.migrateLocalStorageData();
                        if (migrationResult.success) {
                            console.log('✅ Migration successful:', migrationResult.message);
                            // Load the migrated cards from Supabase
                            cards = await this.userDataManager.loadUserDashboardCards();
                        } else {
                            console.error('❌ Migration failed:', migrationResult.message);
                            // Fallback to local cards
                            cards = localCardsArray;
                        }
                    } else {
                        // User already has Supabase cards, use those
                        cards = supabaseCards;
                        // Clear old localStorage if it exists
                        if (localCardsArray.length > 0) {
                            console.log('🧹 Clearing old localStorage after using Supabase cards');
                            localStorage.removeItem('wien_opnv_dashboard_cards');
                        }
                    }
                } else {
                    // No local cards, just load from Supabase
                    cards = await this.userDataManager.loadUserDashboardCards();
                }
                console.log(`📂 Loaded ${cards.length} cards from Supabase`);
            } else {
                const saved = localStorage.getItem('wien_opnv_dashboard_cards');
                cards = saved ? JSON.parse(saved) : [];
                console.log(`📂 Loaded ${cards.length} cards from localStorage`);
            }
            
            if (cards.length > 0) {
                console.log('📋 Load order:', cards.map((c, index) => `${index + 1}. ${c.title}`));
            }
            
            // Clean up invalid cards
            const validCards = cards.filter(card => {
                const hasOldFormat = card.rblNumber && card.line && card.direction;
                const hasValidNewFormat = card.departureLines && 
                    card.departureLines.some(line => line.rbl && line.line && line.direction);
                
                if (!hasOldFormat && !hasValidNewFormat) {
                    console.warn(`🧹 Removing invalid card: ${card.title}`, card);
                    return false;
                }
                return true;
            });
            
            // Save cleaned cards if any were removed
            if (validCards.length !== cards.length) {
                console.log(`🧹 Cleaned up ${cards.length - validCards.length} invalid cards`);
                localStorage.setItem('wien_opnv_dashboard_cards', JSON.stringify(validCards));
                console.log('📋 Cleaned order:', validCards.map((c, index) => `${index + 1}. ${c.title}`));
            }
            
            return validCards;
        } catch (error) {
            console.error('Error loading dashboard cards:', error);
            return [];
        }
    }

    async saveCardConfig() {
        const stationData = document.getElementById('cardStationData').value;
        const selectedLine = document.getElementById('cardLineSelect').value;
        const selectedDirection = document.getElementById('cardDirectionSelect').value;
        
        if (!stationData) {
            alert('Bitte wählen Sie eine Station aus.');
            return;
        }
        
        if (!selectedLine) {
            alert('Bitte wählen Sie eine Linie aus.');
            return;
        }
        
        if (!selectedDirection) {
            alert('Bitte wählen Sie eine Richtung aus.');
            return;
        }
        
        const station = JSON.parse(stationData);
        const lineData = JSON.parse(selectedLine);
        
        const cardData = {
            id: this.currentEditingCard ? this.currentEditingCard.id : Date.now().toString(),
            title: document.getElementById('cardTitle').value || `${station.name} - ${lineData.line}`,
            stationName: station.name,
            stationRbls: lineData.stationRbls || station.rbls || [], // All RBLs for this station
            lineRbls: lineData.rbls || [], // RBLs where this line stops
            line: lineData.line,
            lineId: lineData.lineId,
            direction: selectedDirection,
            size: document.getElementById('cardSize').value,
            departureCount: parseInt(document.getElementById('cardDepartureCount').value),
            refreshInterval: parseInt(document.getElementById('cardRefreshInterval').value),
            position: this.currentEditingCard ? this.currentEditingCard.position : { x: 0, y: 0 }
        };
        
        console.log(`💾 Saving card for station ${station.name}, Line ${lineData.line}, Direction: ${selectedDirection}`);
        console.log(`📍 Using RBLs: ${cardData.lineRbls.join(', ')}`);
        
        let cards = await this.loadDashboardCards();
        
        if (this.currentEditingCard) {
            // Update existing card
            const index = cards.findIndex(c => c.id === this.currentEditingCard.id);
            if (index !== -1) {
                cards[index] = cardData;
            }
        } else {
            // Add new card
            cards.push(cardData);
        }
        
        await this.saveDashboardCards(cards);
        this.closeCardConfig();
        await this.loadDashboard();
    }

    closeCardConfig() {
        document.getElementById('cardConfigModal').style.display = 'none';
        this.currentEditingCard = null;
    }

    async renderDashboardCard(cardData) {
        const card = document.getElementById(`card-${cardData.id}`);
        if (!card) {
            console.warn(`❌ Card element not found for loading: card-${cardData.id}`);
            return;
        }
        
        // Load departures and wait for completion
        await this.loadCardDepartures(cardData);
        
        // Setup auto-refresh after data is loaded
        this.setupCardAutoRefresh(cardData);
        
        return card;
    }

    async loadCardDepartures(cardData) {
        console.log(`🚌 Loading departures for card: ${cardData.title}`);
        console.log(`📊 RBL: ${cardData.rblNumber}, Line: ${cardData.line}, Direction: ${cardData.direction}`);
        
        const card = document.getElementById(`card-${cardData.id}`);
        if (!card) {
            console.warn(`❌ Card element not found: card-${cardData.id}`);
            return;
        }
        
        const contentElement = card.querySelector('.card-content');
        
        // Check if card has required data - support both old and new format
        const hasOldFormat = cardData.rblNumber && cardData.line && cardData.direction;
        const hasNewFormat = cardData.departureLines && cardData.departureLines.length > 0;
        
        // Additional validation for new format
        let hasValidNewFormat = false;
        if (hasNewFormat) {
            hasValidNewFormat = cardData.departureLines.some(line => 
                line.rbl && line.line && line.direction
            );
            
            if (!hasValidNewFormat) {
                console.warn(`❌ Invalid departure lines in card: ${cardData.title}`, cardData.departureLines);
            }
        }
        
        if (!hasOldFormat && !hasValidNewFormat) {
            console.warn(`❌ Incomplete card configuration: ${cardData.title}`);
            console.log('Card data:', cardData);
            contentElement.innerHTML = `
                <div class="error">
                    <div>Unvollständige Kartenkonfiguration</div>
                    <small>Keine gültigen Abfahrtszeilen konfiguriert</small>
                    <button onclick="app.editDashboardCard('${cardData.id}')" style="margin-top: 10px; padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Karte neu konfigurieren
                    </button>
                </div>
            `;
            return;
        }
        
        try {
            // Handle new format with departureLines
            if (cardData.departureLines && cardData.departureLines.length > 0) {
                const allDepartures = [];
                
                for (const departureLine of cardData.departureLines) {
                    try {
                        // Validate departure line data
                        if (!departureLine.rbl || !departureLine.line || !departureLine.direction) {
                            console.warn(`⚠️ Skipping invalid departure line:`, departureLine);
                            continue;
                        }
                        
                        const rblDepartures = await this.fetchDeparturesForRBL(departureLine.rbl);
                        if (rblDepartures && rblDepartures.length > 0) {
                            // Filter for specific line and direction
                            const filteredDepartures = rblDepartures.filter(dep => 
                                dep.line === departureLine.line && dep.towards === departureLine.direction
                            );
                            
                            // Take only the requested number of departures for this line
                            const limitedDepartures = filteredDepartures
                                .sort((a, b) => (a.minutesUntil || 0) - (b.minutesUntil || 0))
                                .slice(0, departureLine.departureCount || 3);
                            
                            allDepartures.push(...limitedDepartures);
                        }
                    } catch (error) {
                        console.warn(`Failed to load departures for ${departureLine.line}:`, error);
                    }
                }
                
                if (allDepartures.length > 0) {
                    console.log(`✅ Loaded ${allDepartures.length} departures for ${cardData.title}`);
                    
                    // Cache departure data for cycling timer
                    if (!this.lastDepartureData) this.lastDepartureData = new Map();
                    this.lastDepartureData.set(cardData.id, allDepartures);
                    
                    contentElement.innerHTML = this.renderCardDepartures(allDepartures, cardData);
                    this.showCard(card);
                } else {
                    console.warn(`⚠️ No live data available for ${cardData.title}`);
                    if (this.displaySettings.hideEmptyCards) {
                        this.hideCard(card);
                    } else {
                        contentElement.innerHTML = `
                            <div class="no-live-data">
                                <div>Im Moment keine Live-Daten verfügbar</div>
                                <small>Möglicherweise fahren gerade keine Fahrzeuge oder der Service ist temporär nicht verfügbar</small>
                            </div>
                        `;
                        this.showCard(card);
                    }
                }
                return;
            }
            
            // Handle old format (fallback)
            const rbls = cardData.lineRbls || cardData.stationRbls || (cardData.rblNumber ? [cardData.rblNumber] : []);
            console.log(`📡 Fetching departures for ${rbls.length} RBLs: ${rbls.join(', ')}`);
            
            // Get departures from all relevant RBLs
            const allDepartures = [];
            
            for (const rbl of rbls) {
                try {
                    const rblDepartures = await this.fetchDeparturesForRBL(rbl);
                    if (rblDepartures && rblDepartures.length > 0) {
                        allDepartures.push(...rblDepartures);
                    }
                } catch (error) {
                    console.warn(`Failed to load departures for RBL ${rbl}:`, error);
                }
            }
            
            if (allDepartures.length > 0) {
                // Filter for specific line and direction
                const filteredDepartures = allDepartures.filter(dep => 
                    dep.line === cardData.line && dep.towards === cardData.direction
                );
                
                if (filteredDepartures.length > 0) {
                    // Sort by departure time and limit to requested number
                    const sortedDepartures = filteredDepartures
                        .sort((a, b) => (a.minutesUntil || 0) - (b.minutesUntil || 0))
                        .slice(0, cardData.departureCount);
                    
                    console.log(`✅ Loaded ${sortedDepartures.length} departures for ${cardData.title} (Line ${cardData.line} → ${cardData.direction})`);
                    contentElement.innerHTML = this.renderCardDepartures(sortedDepartures, cardData);
                    this.showCard(card);
                } else {
                    console.warn(`⚠️ No departures found for line ${cardData.line} direction ${cardData.direction}`);
                    if (this.displaySettings.hideEmptyCards) {
                        this.hideCard(card);
                    } else {
                        contentElement.innerHTML = `
                            <div class="no-live-data">
                                <div>Im Moment keine Live-Daten verfügbar</div>
                                <small>Linie ${cardData.line} → ${cardData.direction}</small>
                                <small>Station: ${cardData.stationName}</small>
                            </div>
                        `;
                        this.showCard(card);
                    }
                }
            } else {
                console.warn(`⚠️ No departures received from any RBL`);
                if (this.displaySettings.hideEmptyCards) {
                    this.hideCard(card);
                } else {
                    contentElement.innerHTML = `
                        <div class="no-live-data">
                            <div>Im Moment keine Live-Daten verfügbar</div>
                            <small>Station: ${cardData.stationName}</small>
                        </div>
                    `;
                    this.showCard(card);
                }
            }
        } catch (error) {
            console.error(`❌ Error loading departures for ${cardData.title}:`, error);
            contentElement.innerHTML = `
                <div class="error">
                    <div>Fehler beim Laden der Abfahrten</div>
                    <small>${error.message}</small>
                </div>
            `;
        } finally {
            // Update timestamp after loading (success or failure)
            this.updateCardTimestamp(cardData.id);
            
            // Setup cycling timer for cards with cycling lines
            this.setupCardCyclingTimer(cardData);
        }
    }

    setupCardCyclingTimer(cardData) {
        if (!cardData.departureLines) return;
        
        const cyclingLines = cardData.departureLines.filter(line => line.enableCycling);
        if (cyclingLines.length === 0) return;
        
        // Clear existing timer for this card
        if (this.cyclingTimers && this.cyclingTimers.has(cardData.id)) {
            clearInterval(this.cyclingTimers.get(cardData.id));
        }
        
        if (!this.cyclingTimers) this.cyclingTimers = new Map();
        
        // Find the shortest interval among all cycling lines for this card
        const shortestInterval = Math.min(...cyclingLines.map(line => (line.cyclingInterval || 5) * 1000));
        
        // Set up timer to re-render card more frequently for smooth progress
        // Update every 200ms for smooth progress bar animation
        const updateInterval = Math.min(200, shortestInterval / 10);
        
        const timer = setInterval(() => {
            const card = document.getElementById(`card-${cardData.id}`);
            const contentElement = card?.querySelector('.card-content');
            if (!card || !contentElement) {
                clearInterval(timer);
                this.cyclingTimers.delete(cardData.id);
                return;
            }
            
            // Re-render without fetching new data (just cycle through existing)
            const existingDepartures = this.lastDepartureData?.get(cardData.id);
            if (existingDepartures && existingDepartures.length > 0) {
                contentElement.innerHTML = this.renderCardDepartures(existingDepartures, cardData);
            }
        }, updateInterval);
        
        this.cyclingTimers.set(cardData.id, timer);
    }

    getNextDepartureLabel(currentIndex, total) {
        const labels = ['nächste', 'übernächste', 'dritte', 'vierte', 'fünfte'];
        return labels[currentIndex] || `${currentIndex + 1}.`;
    }

    showCard(card) {
        if (card) {
            card.style.display = '';
            card.classList.remove('hidden-card');
        }
    }

    hideCard(card) {
        if (card) {
            card.style.display = 'none';
            card.classList.add('hidden-card');
        }
    }

    async openStationInfoFromCard(cardId) {
        const cardData = this.getDashboardCard(cardId);
        if (!cardData) return;
        const modal = document.getElementById('stationInfoModal');
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');
        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = `Station: ${cardData.stationName || cardData.title}`;
        bodyEl.innerHTML = `<div class="loading"><div class="spinner"></div><p>Lade Stationsdetails...</p></div>`;
        // Show modal (support both existing show mechanism and fallback)
        modal.classList.add('open');
        if (modal.style.display === 'none' || getComputedStyle(modal).display === 'none') {
            modal.style.display = 'block';
        }

        try {
            // Collect meta
            const rbls = (cardData.rblNumbers || cardData.rblList || (cardData.rblNumber ? [cardData.rblNumber] : [])).filter(Boolean);
            const departuresData = [];
            for (const r of rbls.slice(0, 8)) { // limit to avoid overload
                try {
                    const resp = await fetch(`/api/departures/${r}`);
                    if (resp.ok) {
                        const json = await resp.json();
                        departuresData.push({ rbl: r, raw: json });
                    }
                } catch (e) {
                    console.warn('RBL fetch failed', r, e);
                }
            }

            // Extract lines & departures
            const lineMap = new Map();
            departuresData.forEach(entry => {
                const monitors = entry.raw?.data?.monitors || [];
                monitors.forEach(m => {
                    (m.lines || []).forEach(line => {
                        if (!line?.name) return;
                        if (!lineMap.has(line.name)) {
                            lineMap.set(line.name, { name: line.name, departures: [] });
                        }
                        const depList = lineMap.get(line.name).departures;
                        (line.departures || []).forEach(d => depList.push({
                            countdown: d?.departureTime?.countdown,
                            timePlanned: d?.plannedTime?.timePlanned,
                            timeReal: d?.departureTime?.timeReal,
                            direction: line?.towards,
                            platform: m?.locationStop?.properties?.title,
                            rbl: entry.rbl
                        }));
                    });
                });
            });

            const linesArray = Array.from(lineMap.values()).sort((a,b)=>a.name.localeCompare(b.name,'de-AT'));

            // Build HTML
            let html = `<div class="station-meta">`;
            html += `<p><strong>RBLs:</strong> ${rbls.join(', ') || '–'}</p>`;
            if (cardData.latitude && cardData.longitude) {
                html += `<p><strong>Position:</strong> ${cardData.latitude.toFixed(5)}, ${cardData.longitude.toFixed(5)} <button class="mini-map-btn" data-lat="${cardData.latitude}" data-lng="${cardData.longitude}"><i class="fas fa-map-marker-alt"></i> Karte</button></p>`;
            }
            html += `<p><strong>Linien (live gefunden):</strong> ${linesArray.map(l=>l.name).join(', ') || '–'}</p>`;
            html += `</div>`;

            if (linesArray.length) {
                html += `<div class="lines-section">`;
                linesArray.forEach(line => {
                    const deps = line.departures
                        .filter(d=>d.countdown!=null)
                        .sort((a,b)=>a.countdown-b.countdown)
                        .slice(0,10);
                    html += `<div class="line-block">`;
                    html += `<h4>Linie ${line.name}</h4>`;
                    if (deps.length) {
                        html += `<table class="departures-table"><thead><tr><th>in</th><th>Richtung</th><th>Gleis/Steig</th><th>RBL</th></tr></thead><tbody>`;
                        deps.forEach(d => {
                            html += `<tr><td>${d.countdown} min</td><td>${d.direction||''}</td><td>${d.platform||''}</td><td>${d.rbl}</td></tr>`;
                        });
                        html += `</tbody></table>`;
                    } else {
                        html += `<p class="no-data">Keine Abfahrten</p>`;
                    }
                    html += `</div>`;
                });
                html += `</div>`;
            } else {
                html += `<p>Keine Live-Linien gefunden.</p>`;
            }

            bodyEl.innerHTML = html;

            // Mini map open handler (placeholder: open new window / map provider)
            bodyEl.querySelectorAll('.mini-map-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const lat = e.currentTarget.getAttribute('data-lat');
                    const lng = e.currentTarget.getAttribute('data-lng');
                    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`, '_blank');
                });
            });
        } catch (err) {
            bodyEl.innerHTML = `<div class="error">Fehler beim Laden: ${err.message}</div>`;
        }
    }

    renderCardDepartures(departures, cardData) {
        // Handle new format with multiple departure lines
        if (cardData.departureLines && cardData.departureLines.length > 0) {
            return this.renderMultiLineDepartures(departures, cardData);
        }
        
        // Handle old format (single line)
        const sortedDepartures = departures
            .sort((a, b) => {
                const timeA = this.parseCountdown(a.countdown);
                const timeB = this.parseCountdown(b.countdown);
                return timeA - timeB;
            })
            .slice(0, cardData.departureCount);
        
        const footerInfo = `
            <small>Linie ${cardData.line} → ${cardData.direction}</small>
            <small>RBL: ${cardData.rblNumber} | Update: ${new Date().toLocaleTimeString()}</small>
        `;
        
        return `
            <div class="departures-list">
                ${sortedDepartures.map(dep => `
                    <div class="departure-item">
                        <div class="line-info">
                            <span class="line-badge line-${dep.type.toLowerCase()} ${this.getLineBadgeClass(dep.line, dep.type.toLowerCase())}">${dep.line}</span>
                            <span class="direction">${dep.towards}</span>
                        </div>
                        <div class="departure-time">
                            ${this.formatDepartureTime(dep)}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="card-footer">
                ${footerInfo}
            </div>
        `;
    }

    renderMultiLineDepartures(departures, cardData) {
        const maxRows = cardData.maxDepartureRows || 9;
        const cyclingLines = cardData.departureLines.filter(line => line.enableCycling);
        const staticLines = cardData.departureLines.filter(line => !line.enableCycling);
        
        // Group departures by line
        const departuresByLine = new Map();
        cardData.departureLines.forEach(line => {
            departuresByLine.set(`${line.line}_${line.direction}`, []);
        });
        
        // Sort departures into line groups
        departures.forEach(dep => {
            const key = `${dep.line}_${dep.towards}`;
            if (departuresByLine.has(key)) {
                departuresByLine.get(key).push(dep);
            }
        });
        
        let renderResult = [];
        let usedRows = 0;
        
        // First, render static lines (non-cycling)
        staticLines.forEach(lineConfig => {
            const key = `${lineConfig.line}_${lineConfig.direction}`;
            const lineDepartures = departuresByLine.get(key) || [];
            const sortedDepartures = lineDepartures
                .sort((a, b) => this.parseCountdown(a.countdown) - this.parseCountdown(b.countdown));
            
            // Apply autoSort if enabled
            const finalDepartures = cardData.autoSort !== false ? 
                sortedDepartures.slice(0, lineConfig.departureCount || 3) :
                lineDepartures.slice(0, lineConfig.departureCount || 3);
            
            finalDepartures.forEach(dep => {
                if (usedRows < maxRows) {
                    renderResult.push({
                        departure: dep,
                        isStatic: true
                    });
                    usedRows++;
                }
            });
        });
        
        // Then, render cycling lines - only show current cycling departure per line
        if (cyclingLines.length > 0 && usedRows < maxRows) {
            cyclingLines.forEach(lineConfig => {
                if (usedRows >= maxRows) return;
                
                const key = `${lineConfig.line}_${lineConfig.direction}`;
                const lineDepartures = departuresByLine.get(key) || [];
                
                if (lineDepartures.length === 0) return;
                
                const sortedDepartures = lineDepartures
                    .sort((a, b) => this.parseCountdown(a.countdown) - this.parseCountdown(b.countdown));
                
                // Get current cycling index for this line
                const cyclingKey = `${cardData.id}_${lineConfig.id}`;
                if (!this.cyclingState) this.cyclingState = new Map();
                if (!this.cyclingState.has(cyclingKey)) {
                    this.cyclingState.set(cyclingKey, { index: 0, lastUpdate: Date.now() });
                }
                
                const state = this.cyclingState.get(cyclingKey);
                const interval = (lineConfig.cyclingInterval || 5) * 1000;
                const maxDepartures = Math.min(lineConfig.departureCount || 3, sortedDepartures.length);
                
                // Check if we need to advance to next departure
                if (Date.now() - state.lastUpdate >= interval) {
                    state.index = (state.index + 1) % maxDepartures;
                    state.lastUpdate = Date.now();
                }
                
                // Show only the current departure for this cycling line
                const currentDeparture = sortedDepartures[state.index];
                if (currentDeparture) {
                    // Calculate progress within current interval
                    const timeSinceUpdate = Date.now() - state.lastUpdate;
                    const progressPercent = Math.min((timeSinceUpdate / interval) * 100, 100);
                    
                    renderResult.push({
                        departure: currentDeparture,
                        isStatic: false,
                        cyclingInfo: {
                            current: state.index + 1,
                            total: maxDepartures,
                            lineId: lineConfig.id,
                            progress: progressPercent,
                            nextLabel: this.getNextDepartureLabel(state.index, maxDepartures)
                        }
                    });
                    usedRows++;
                }
            });
        }
        
        // Generate HTML
        const departureItems = renderResult.map(item => `
            <div class="departure-item ${item.isStatic ? 'static-departure' : 'cycling-departure'}">
                <div class="line-info">
                    <span class="line-badge line-${item.departure.type.toLowerCase()} ${this.getLineBadgeClass(item.departure.line, item.departure.type.toLowerCase())}">${item.departure.line}</span>
                    <span class="direction">${item.departure.towards}</span>
                </div>
                <div class="departure-time">
                    ${item.cyclingInfo ? '' : this.formatDepartureTime(item.departure)}
                </div>
                ${item.cyclingInfo ? `
                    <div class="cycling-status">
                        <span class="cycling-label">${item.cyclingInfo.nextLabel} Abfahrt</span>
                        <span class="cycling-position">${item.cyclingInfo.current}/${item.cyclingInfo.total}</span>
                        <div class="cycling-progress-container">
                            <div class="cycling-progress-bar">
                                <div class="cycling-tram-track">
                                    <div class="cycling-tram ${this.getVehicleType(item.line)}" style="left: ${item.cyclingInfo.progress}%"></div>
                                    <div class="cycling-progress-fill" style="width: ${item.cyclingInfo.progress}%"></div>
                                </div>
                            </div>
                            <span class="cycling-countdown">${item.departure.countdown}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Generate footer
        const lineCount = cardData.departureLines.length;
        const stationName = cardData.stationName || cardData.station?.name || cardData.title || 'Station';
        const staticCount = staticLines.length;
        const cyclingCount = cyclingLines.length;
        
        let configInfo = '';
        if (staticCount > 0 && cyclingCount > 0) {
            configInfo = `${staticCount} fest, ${cyclingCount} durchschaltend`;
        } else if (staticCount > 0) {
            configInfo = `${staticCount} Linien fest`;
        } else {
            configInfo = `${cyclingCount} Linien durchschaltend`;
        }
        
        const footerInfo = `
            <small>${stationName} (${lineCount} ${lineCount === 1 ? 'Linie' : 'Linien'}) - ${configInfo}</small>
            <small>Max ${maxRows} Zeilen | Update: ${new Date().toLocaleTimeString()}</small>
        `;
        
        return `
            <div class="departures-list">
                ${departureItems}
            </div>
            <div class="card-footer">
                ${footerInfo}
            </div>
        `;
    }

    formatDepartureTime(departure) {
        if (!this.displaySettings || !this.displaySettings.timeDisplayOptions) {
            return `<span class="countdown-text">${departure.countdown}</span>`;
        }

        const selectedOptions = this.displaySettings.timeDisplayOptions;
        
        // Calculate times
        const now = new Date();
        const minutes = this.parseCountdown(departure.countdown);
        const arrivalTime = new Date(now.getTime() + minutes * 60000);
        const actualTimeString = arrivalTime.toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Calculate delay and expected time
        const delay = departure.delay || 0;
        const isRealtime = departure.realtime;
        const expectedArrival = new Date(arrivalTime.getTime() - delay * 60000);
        const expectedTimeString = expectedArrival.toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Build time display elements - separate left and right elements
        const leftElements = [];
        let countdownElement = '';

        if (selectedOptions.includes('expected')) {
            if (isRealtime && delay !== 0) {
                leftElements.push(`<span class="expected-text">${expectedTimeString}</span>`);
            } else {
                leftElements.push(`<span class="expected-text">${actualTimeString}</span>`);
            }
        }

        if (selectedOptions.includes('actual')) {
            leftElements.push(`<span class="actual-text">${actualTimeString}</span>`);
        }

        if (selectedOptions.includes('difference')) {
            if (isRealtime && delay !== 0) {
                const diffText = delay > 0 ? `+${delay} min` : `${delay} min`;
                const diffClass = delay > 2 ? 'diff-delayed' : delay < -1 ? 'diff-early' : 'diff-ontime';
                leftElements.push(`<span class="difference-text ${diffClass}">${diffText}</span>`);
            } else {
                leftElements.push(`<span class="difference-text diff-ontime">pünktlich</span>`);
            }
        }

        if (selectedOptions.includes('countdown')) {
            countdownElement = `<span class="countdown-text">${departure.countdown}</span>`;
        }

        // Create layout with left elements and countdown on the right
        const leftContent = leftElements.length > 0 ? `<div class="time-left-elements">${leftElements.join('')}</div>` : '';
        const rightContent = countdownElement ? `<div class="time-right-element">${countdownElement}</div>` : '';

        return `<div class="time-display-split">${leftContent}${rightContent}</div>`;
    }

    setupCardAutoRefresh(cardData) {
        // Clear existing interval
        if (this.cardRefreshIntervals && this.cardRefreshIntervals[cardData.id]) {
            clearInterval(this.cardRefreshIntervals[cardData.id]);
        }
        
        // Initialize intervals object
        if (!this.cardRefreshIntervals) {
            this.cardRefreshIntervals = {};
        }
        
        // Initialize spinner timers object
        if (!this.cardSpinnerTimers) {
            this.cardSpinnerTimers = {};
        }
        
        const refreshInterval = (cardData.refreshInterval || 15) * 1000;
        
        // Update initial timestamp
        this.updateCardTimestamp(cardData.id);
        
        // Set new interval
        this.cardRefreshIntervals[cardData.id] = setInterval(() => {
            this.startRefreshSpinner(cardData.id, refreshInterval);
            this.loadCardDepartures(cardData);
        }, refreshInterval);
    }

    startRefreshSpinner(cardId, duration) {
        const spinner = document.getElementById(`spinner-${cardId}`);
        if (!spinner) return;
        
        // Clear any existing timer
        if (this.cardSpinnerTimers[cardId]) {
            clearTimeout(this.cardSpinnerTimers[cardId]);
        }
        
        // Start spinning
        spinner.style.animationDuration = `${duration}ms`;
        spinner.classList.add('spinning');
        
        // Stop spinning after duration
        this.cardSpinnerTimers[cardId] = setTimeout(() => {
            spinner.classList.remove('spinning');
            this.updateCardTimestamp(cardId);
        }, duration);
    }

    updateCardTimestamp(cardId) {
        const updateElement = document.getElementById(`lastUpdate-${cardId}`);
        if (!updateElement) return;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        const textElement = updateElement.querySelector('.update-text');
        if (textElement) {
            textElement.textContent = `Letzte Aktualisierung: ${timeString}`;
        }
    }

    async getDashboardCard(cardId) {
        const cards = await this.loadDashboardCards();
        return cards.find(c => c.id === cardId);
    }

    async removeDashboardCard(cardId) {
        if (confirm('Möchten Sie diese Karte wirklich entfernen?')) {
            console.log(`🗑️ Attempting to remove dashboard card: ${cardId}`);
            
            // Remove from DOM
            const cardElement = document.getElementById(`card-${cardId}`);
            if (cardElement) {
                cardElement.remove();
                console.log(`✅ Removed card element from DOM: card-${cardId}`);
            } else {
                console.log(`⚠️ Card element not found in DOM: card-${cardId}`);
            }
            
            // Clear refresh interval
            if (this.cardRefreshIntervals && this.cardRefreshIntervals[cardId]) {
                clearInterval(this.cardRefreshIntervals[cardId]);
                delete this.cardRefreshIntervals[cardId];
                console.log(`✅ Cleared refresh interval for card: ${cardId}`);
            }
            
            // Clear cycling timer
            if (this.cyclingTimers && this.cyclingTimers.has(cardId)) {
                clearInterval(this.cyclingTimers.get(cardId));
                this.cyclingTimers.delete(cardId);
                console.log(`✅ Cleared cycling timer for card: ${cardId}`);
            }
            
            // Clean up cycling state for this card
            if (this.cyclingState) {
                const keysToDelete = [];
                for (const key of this.cyclingState.keys()) {
                    if (key.startsWith(`${cardId}_`)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => this.cyclingState.delete(key));
                if (keysToDelete.length > 0) {
                    console.log(`✅ Cleared cycling state for card: ${cardId} (${keysToDelete.length} entries)`);
                }
            }
            
            // Clean up departure data cache
            if (this.lastDepartureData && this.lastDepartureData.has(cardId)) {
                this.lastDepartureData.delete(cardId);
                console.log(`✅ Cleared departure data cache for card: ${cardId}`);
            }
            
            // Remove from storage and update instance variable
            let cards = await this.loadDashboardCards();
            console.log(`📊 Cards before removal:`, cards.map(c => c.id));
            
            cards = cards.filter(c => c.id !== cardId);
            console.log(`📊 Cards after removal:`, cards.map(c => c.id));
            
            this.dashboardCards = cards; // Update instance variable
            
            // Save to localStorage
            try {
                await this.saveDashboardCards(cards);
                console.log(`✅ Successfully saved ${cards.length} cards after removal`);
                
                // Verify save
                const verification = localStorage.getItem('wien_opnv_dashboard_cards');
                const verifiedCards = verification ? JSON.parse(verification) : [];
                console.log(`� Verification: ${verifiedCards.length} cards in localStorage`);
            } catch (error) {
                console.error('❌ Error saving to localStorage:', error);
            }
            
            // Update empty state
            this.updateDashboardEmptyState();
            
            console.log(`✅ Dashboard card removal completed for: ${cardId}`);
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        console.log(`🔧 Toggle edit mode: ${this.isEditMode}`);
        
        const dashboardGrid = document.getElementById('dashboardGrid');
        const editBtn = document.getElementById('editDashboard');
        const editModeInfo = document.getElementById('editModeInfo');
        const cards = document.querySelectorAll('.dashboard-card');
        
        if (this.isEditMode) {
            // Enter Edit Mode
            console.log('✅ Entering edit mode');
            
            // Update button
            if (editBtn) {
                editBtn.innerHTML = '<i class="fas fa-check"></i><span>Fertig</span>';
                editBtn.classList.remove('btn-secondary');
                editBtn.classList.add('btn-success');
            }
            
            // Show edit mode info
            if (editModeInfo) {
                editModeInfo.style.display = 'block';
            }
            
            // Add edit mode classes to cards
            cards.forEach(card => {
                card.classList.add('edit-mode');
                this.addCardEditControls(card);
            });
            
            // Enable drag and drop
            this.enableDashboardDragDrop();
            
            // Setup edit mode event listeners
            this.setupEditModeListeners();
            
        } else {
            // Exit Edit Mode
            console.log('❌ Exiting edit mode');
            
            // Update button
            if (editBtn) {
                editBtn.innerHTML = '<i class="fas fa-edit"></i><span>Dashboard bearbeiten</span>';
                editBtn.classList.remove('btn-success');
                editBtn.classList.add('btn-secondary');
            }
            
            // Hide edit mode info
            if (editModeInfo) {
                editModeInfo.style.display = 'none';
            }
            
            // Remove edit mode classes and controls
            cards.forEach(card => {
                card.classList.remove('edit-mode', 'selected');
                this.removeCardEditControls(card);
            });
            
            // Disable drag and drop
            this.disableDashboardDragDrop();
            
            // Update selection buttons
            this.updateSelectionButtons();
        }
    }

    addCardEditControls(card) {
        // Add drag handle
        if (!card.querySelector('.drag-handle')) {
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
            dragHandle.title = 'Karte verschieben';
            card.appendChild(dragHandle);
        }
        
        // Add edit button (pencil icon)
        if (!card.querySelector('.card-edit-btn')) {
            const editBtn = document.createElement('button');
            editBtn.className = 'card-edit-btn';
            editBtn.title = 'Karte bearbeiten';
            editBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            `;
            
            // Get card data for editing
            const cardId = card.getAttribute('data-card-id');
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`✏️ Editing card: ${cardId}`);
                
                // Find card data and open edit modal
                const cardData = this.getDashboardCard(cardId);
                if (cardData) {
                    this.addDashboardCard(cardData);
                } else {
                    console.warn(`❌ Card data not found for ID: ${cardId}`);
                }
            });
            
            card.appendChild(editBtn);
        }
        
        // Add modern checkbox
        if (!card.querySelector('.card-checkbox')) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'card-checkbox';
            checkbox.title = 'Karte auswählen';
            checkbox.addEventListener('change', () => {
                card.classList.toggle('selected', checkbox.checked);
                this.updateSelectionButtons();
            });
            card.appendChild(checkbox);
        }
    }

    removeCardEditControls(card) {
        const dragHandle = card.querySelector('.drag-handle');
        const checkbox = card.querySelector('.card-checkbox');
        const editBtn = card.querySelector('.card-edit-btn');
        
        if (dragHandle) dragHandle.remove();
        if (checkbox) checkbox.remove();
        if (editBtn) editBtn.remove();
    }

    setupEditModeListeners() {
        const selectAllBtn = document.getElementById('selectAllCards');
        const deleteSelectedBtn = document.getElementById('deleteSelectedCards');
        
        if (selectAllBtn) {
            selectAllBtn.onclick = () => this.selectAllCards();
        }
        
        if (deleteSelectedBtn) {
            deleteSelectedBtn.onclick = () => this.deleteSelectedCards();
        }
    }

    selectAllCards() {
        const checkboxes = document.querySelectorAll('.card-checkbox');
        const allSelected = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allSelected;
            const card = checkbox.closest('.dashboard-card');
            if (card) {
                card.classList.toggle('selected', checkbox.checked);
            }
        });
        
        this.updateSelectionButtons();
    }

    updateSelectionButtons() {
        const selectedCards = document.querySelectorAll('.dashboard-card.selected');
        const deleteBtn = document.getElementById('deleteSelectedCards');
        const selectAllBtn = document.getElementById('selectAllCards');
        
        if (deleteBtn) {
            deleteBtn.disabled = selectedCards.length === 0;
            deleteBtn.innerHTML = `<i class="fas fa-trash"></i>Löschen (${selectedCards.length})`;
        }
        
        if (selectAllBtn) {
            const allCards = document.querySelectorAll('.dashboard-card');
            const allSelected = selectedCards.length === allCards.length && allCards.length > 0;
            selectAllBtn.innerHTML = allSelected 
                ? '<i class="fas fa-square"></i>Alle abwählen'
                : '<i class="fas fa-check-square"></i>Alle auswählen';
        }
    }

    async deleteSelectedCards() {
        const selectedCards = document.querySelectorAll('.dashboard-card.selected');
        if (selectedCards.length === 0) return;
        
        const confirmMessage = selectedCards.length === 1 
            ? 'Möchten Sie die ausgewählte Karte wirklich löschen?'
            : `Möchten Sie die ${selectedCards.length} ausgewählten Karten wirklich löschen?`;
            
        if (confirm(confirmMessage)) {
            const cardIds = Array.from(selectedCards).map(card => card.dataset.cardId);
            for (const cardId of cardIds) {
                await this.removeDashboardCard(cardId);
            }
            this.updateSelectionButtons();
        }
    }

    enableDashboardDragDrop() {
        const dashboardGrid = document.getElementById('dashboardGrid');
        if (!dashboardGrid) return;
        
        // Destroy existing sortable if it exists
        if (this.dashboardSortable) {
            this.dashboardSortable.destroy();
        }
        
        this.dashboardSortable = new Sortable(dashboardGrid, {
            handle: '.drag-handle',
            animation: 200,
            ghostClass: 'dragging',
            chosenClass: 'dragging',
            dragClass: 'dragging',
            onStart: (evt) => {
                console.log('🚀 Drag started:', evt.item.querySelector('.card-title')?.textContent);
                evt.item.classList.add('dragging');
                
                // Add visual feedback
                const dragInfo = document.createElement('div');
                dragInfo.id = 'drag-info';
                dragInfo.style.cssText = `
                    position: fixed;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--primary-color);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    z-index: 10000;
                    pointer-events: none;
                `;
                dragInfo.innerHTML = '<i class="fas fa-arrows-alt"></i> Karte verschieben...';
                document.body.appendChild(dragInfo);
            },
            onEnd: (evt) => {
                const cardTitle = evt.item.querySelector('.card-title')?.textContent;
                console.log(`✅ Drag ended: ${cardTitle} (${evt.oldIndex} → ${evt.newIndex})`);
                evt.item.classList.remove('dragging');
                
                // Remove drag info
                const dragInfo = document.getElementById('drag-info');
                if (dragInfo) dragInfo.remove();
                
                this.reorderDashboardCards(evt.oldIndex, evt.newIndex).catch(error => {
                    console.error('❌ Error reordering cards:', error);
                });
            }
        });
        
        console.log('✅ Dashboard drag & drop enabled');
    }

    disableDashboardDragDrop() {
        if (this.dashboardSortable) {
            this.dashboardSortable.destroy();
            this.dashboardSortable = null;
            console.log('❌ Dashboard drag & drop disabled');
        }
    }

    async reorderDashboardCards(oldIndex, newIndex) {
        if (oldIndex === newIndex) return;
        
        console.log(`🔄 Reordering cards: ${oldIndex} -> ${newIndex}`);
        
        const cards = await this.loadDashboardCards();
        if (!cards || cards.length === 0) {
            console.warn('❌ No cards to reorder');
            return;
        }
        
        console.log('📋 Cards before reorder:', cards.map(c => c.title));
        
        // Reorder the array
        const movedCard = cards.splice(oldIndex, 1)[0];
        cards.splice(newIndex, 0, movedCard);
        
        console.log('📋 Cards after reorder:', cards.map(c => c.title));
        
        // Save the new order
        await this.saveDashboardCards(cards);
        console.log('✅ Card order saved to localStorage');
        
        // Optional: Add visual feedback
        this.showOrderChangeNotification();
    }

    showOrderChangeNotification() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        notification.innerHTML = '<i class="fas fa-check"></i> Reihenfolge gespeichert';
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.style.opacity = '1', 10);
        
        // Remove after 2 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    updateDashboardEmptyState() {
        const grid = document.getElementById('dashboardGrid');
        const emptyState = document.getElementById('dashboardEmpty');
        
        if (grid && emptyState) {
            if (grid.children.length === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
            }
        }
    }

    loadFavoritesPage() {
        const favoritesList = document.getElementById('favoritesList');
        if (favoritesList) {
            if (!this.favorites || this.favorites.length === 0) {
                favoritesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-star"></i>
                        <h3>Keine Favoriten</h3>
                        <p>Fügen Sie Stationen zu Ihren Favoriten hinzu, um sie hier zu sehen.</p>
                    </div>
                `;
            } else {
                favoritesList.innerHTML = this.favorites.map(fav => `
                    <div class="station-item" onclick="app.selectStationFromFavorite('${fav.diva}')">
                        <div class="station-info">
                            <div class="station-name">
                                <i class="fas fa-subway" style="color: var(--primary-color); margin-right: 8px;"></i>
                                ${fav.name}
                            </div>
                            <div class="station-rbl">${fav.rbl_count} RBL-Nummern • ${fav.municipality || 'Wien'}</div>
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); app.removeFromFavorites('${fav.diva}')" title="Aus Favoriten entfernen">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('');
            }
        }
    }

    loadSettingsPage() {
        // Load current settings into UI
        const darkModeToggle = document.getElementById('darkModeToggle');
        const refreshInterval = document.getElementById('refreshInterval');
        const defaultStartPage = document.getElementById('defaultStartPage');

        if (defaultStartPage && this.settings) {
            defaultStartPage.value = this.settings.defaultStartPage || 'start';
        }

        if (darkModeToggle && this.settings) {
            darkModeToggle.checked = this.settings.darkMode || false;
        }
        
        if (refreshInterval && this.settings) {
            refreshInterval.value = this.settings.refreshInterval || 30;
        }

        // Initialize dashboard layout and animation options
        console.log('📄 Settings page loaded, initializing layout and animation options...');
        this.setupDashboardLayoutOptions();
        this.setupAnimationToggle();
        
        // Apply current settings immediately
        this.applyDisplaySettings();
    }

    // Favorites Management
    loadFavorites() {
        const saved = localStorage.getItem('wien_opnv_favorites');
        this.favorites = saved ? JSON.parse(saved) : [];
    }

    saveFavorites() {
        localStorage.setItem('wien_opnv_favorites', JSON.stringify(this.favorites));
    }

    addToFavorites(station = null) {
        const targetStation = station || this.selectedStation;
        if (!targetStation) return;
        
        const exists = this.favorites.some(fav => fav.diva === targetStation.diva);
        if (exists) {
            this.removeFromFavorites(targetStation.diva);
        } else {
            this.favorites.push(targetStation);
            this.saveFavorites();
            if (!station && this.selectedStation) {
                this.updateFavoriteButton();
            }
        }
    }

    removeFromFavorites(diva) {
        this.favorites = this.favorites.filter(fav => fav.diva !== diva);
        this.saveFavorites();
        
        if (this.currentPage === 'favorites') {
            // If the removed station was currently selected on favorites page, go back to list
            if (this.selectedStation && this.selectedStation.diva === diva) {
                this.backToFavoritesList();
            } else {
                this.loadFavoritesPage();
            }
        }
        if (this.selectedStation && this.selectedStation.diva === diva) {
            this.updateFavoriteButton();
        }
    }

    toggleFavorite(diva, buttonElement) {
        const station = this.stations.find(s => s.diva === diva);
        if (!station) return;

        this.loadFavorites();
        const isFavorite = this.favorites.some(fav => fav.diva === diva);

        if (isFavorite) {
            this.removeFromFavorites(diva);
            buttonElement.classList.remove('favorited');
            buttonElement.title = 'Zu Favoriten hinzufügen';
        } else {
            this.addToFavorites(station);
            buttonElement.classList.add('favorited');
            buttonElement.title = 'Aus Favoriten entfernen';
        }

        // Refresh favorites quick-select if showing
        const searchInput = document.getElementById('stationSearch');
        if (searchInput && searchInput.value.length < 2) {
            this.displayFavoriteQuickSelect();
        }
    }

    isFavoriteStation() {
        if (!this.selectedStation) return false;
        this.loadFavorites();
        return this.favorites.some(fav => fav.diva === this.selectedStation.diva);
    }

    toggleCurrentStationFavorite(buttonElement) {
        if (!this.selectedStation) return;

        const isFavorite = this.isFavoriteStation();

        if (isFavorite) {
            this.removeFromFavorites(this.selectedStation.diva);
            // Update all line header stars
            document.querySelectorAll('.line-favorite').forEach(btn => {
                btn.classList.remove('favorited');
                btn.title = 'Zu Favoriten hinzufügen';
            });
        } else {
            this.addToFavorites(this.selectedStation);
            // Update all line header stars
            document.querySelectorAll('.line-favorite').forEach(btn => {
                btn.classList.add('favorited');
                btn.title = 'Aus Favoriten entfernen';
            });
        }
    }

    clearAllFavorites() {
        if (confirm('Alle Favoriten löschen?')) {
            this.favorites = [];
            this.saveFavorites();
            this.loadFavoritesPage();
        }
    }

    selectStationFromFavorite(diva) {
        const station = this.stations.find(s => s.diva === diva);
        if (!station) return;

        this.selectedStation = station;
        this.currentRBLs = station.rbls || [];
        
        // Favoritenliste ausblenden und "Zurück" Button anzeigen
        this.showBackToFavoritesButton();
        
        // Update section header with station name
        this.updateFavoriteSectionHeader(station.name);
        
        // Load departures directly
        this.loadFavoriteDepartures();
    }

    showBackToFavoritesButton() {
        const favoritesList = document.getElementById('favoritesList');
        if (favoritesList) {
            favoritesList.innerHTML = `
                <div class="back-to-favorites">
                    <button class="back-btn" onclick="app.backToFavoritesList()">
                        <i class="fas fa-arrow-left"></i>
                        <span>Zurück zu Favoriten</span>
                    </button>
                </div>
            `;
        }
    }

    backToFavoritesList() {
        // Station-Details ausblenden
        const departuresSection = document.getElementById('favoriteDepartures');
        
        if (departuresSection) departuresSection.style.display = 'none';
        
        // Ausgewählte Station zurücksetzen
        this.selectedStation = null;
        this.currentRBLs = [];
        
        // Favoritenliste wieder anzeigen
        this.loadFavoritesPage();
    }

    updateFavoriteSectionHeader(stationName) {
        const sectionTitle = document.getElementById('favoriteStationName');
        if (sectionTitle) {
            sectionTitle.innerHTML = `
                <i class="fas fa-subway"></i>
                <span class="station-name">${stationName}</span>
                <span class="section-subtitle">Live Abfahrten</span>
            `;
        }
    }

    async loadFavoriteDepartures() {
        const departuresContainer = document.getElementById('favoriteDeparturesContainer');
        const departuresSection = document.getElementById('favoriteDepartures');
        const lastUpdate = document.getElementById('favoriteLastUpdate');
        
        if (!departuresContainer || !this.currentRBLs || this.currentRBLs.length === 0) return;

        departuresSection.style.display = 'block';
        
        // Ladeanimation mit Fortschritt anzeigen
        departuresContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Lade Abfahrten...</div>
                <div class="loading-progress">
                    <div class="progress-text">
                        <span id="favoriteProgressCurrent">0</span>/<span id="favoriteProgressTotal">${this.currentRBLs.length}</span>
                        (<span id="favoriteProgressPercent">0</span>%)
                    </div>
                    <div class="progress-bar">
                        <div id="favoriteProgressBar" class="progress-fill"></div>
                    </div>
                </div>
            </div>
        `;

        try {
            const departures = await this.fetchLiveDeparturesWithProgress(this.currentRBLs, 'favorite');
            
            if (departures && departures.length > 0) {
                this.displayFavoriteDepartures(departures);
            } else {
                departuresContainer.innerHTML = '<div class="no-data">Keine Abfahrten verfügbar</div>';
            }
            
            if (lastUpdate) {
                lastUpdate.textContent = `Aktualisiert: ${new Date().toLocaleTimeString()}`;
            }
            
        } catch (error) {
            console.error('Fehler beim Laden der Abfahrten:', error);
            departuresContainer.innerHTML = '<div class="error">Fehler beim Laden der Abfahrten</div>';
        }
    }

    displayFavoriteDepartures(departures) {
        const departuresContainer = document.getElementById('favoriteDeparturesContainer');
        if (!departuresContainer) return;

        // Group departures by line
        const groupedDepartures = this.groupDeparturesByLine(departures);
        
        const html = Object.entries(groupedDepartures).map(([lineId, lineDepartures]) => {
            const firstDeparture = lineDepartures[0];
            const initialDepartures = lineDepartures.slice(0, 2);
            const hiddenDepartures = lineDepartures.slice(2);
            
            return `
                <div class="departure-line-group">
                    <div class="line-header">
                        <div class="line-info">
                            <span class="line-badge line-${firstDeparture.type} ${this.getLineBadgeClass(firstDeparture.line, firstDeparture.type)}">
                                ${firstDeparture.line}
                            </span>
                            <span class="line-type">${this.getLineTypeText(firstDeparture.type)}</span>
                        </div>
                        <button class="favorite-star line-favorite favorited" 
                                onclick="event.stopPropagation(); app.toggleCurrentStationFavorite(this)"
                                title="Aus Favoriten entfernen">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <div class="departures-list">
                        ${this.renderSearchDepartureItems(initialDepartures, 'visible')}
                        ${hiddenDepartures.length > 0 ? this.renderSearchDepartureItems(hiddenDepartures, 'hidden', lineId) : ''}
                        ${hiddenDepartures.length > 0 ? `
                            <div class="show-more-container">
                                <button class="show-more-btn" onclick="window.app.showMoreDepartures('${lineId}', this)">
                                    <i class="fas fa-chevron-down"></i>
                                    <span>+${hiddenDepartures.length} weitere anzeigen</span>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        departuresContainer.innerHTML = html;
    }

    updateFavoriteButton() {
        const addBtn = document.getElementById('addToFavorites');
        if (addBtn && this.selectedStation) {
            const isFavorite = this.favorites.some(fav => fav.diva === this.selectedStation.diva);
            addBtn.innerHTML = isFavorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
        }
    }

    // Settings Management
    loadSettings() {
        const saved = localStorage.getItem('wien_opnv_settings');
        this.settings = saved ? JSON.parse(saved) : {
            darkMode: false,
            refreshInterval: 30,
            autoRefresh: false
        };
        this.applySettings();
    }

    saveSettings() {
        localStorage.setItem('wien_opnv_settings', JSON.stringify(this.settings));
    }

    applySettings() {
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Apply auto-refresh setting
        const autoRefreshToggle = document.getElementById('autoRefreshToggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.checked = this.settings.autoRefresh;
        }
        
        // Apply refresh interval setting
        const refreshIntervalSelect = document.getElementById('refreshInterval');
        if (refreshIntervalSelect) {
            refreshIntervalSelect.value = this.settings.refreshInterval.toString();
        }
    }

    toggleDarkMode() {
        this.settings.darkMode = !this.settings.darkMode;
        this.saveSettings();
        this.applySettings();
    }

    setDefaultStartPage(page) {
        this.settings.defaultStartPage = page;
        this.saveSettings();
        console.log(`🏠 Standard-Startseite geändert: ${page}`);
    }

    // Quick Actions
    showNearbyStations() {
        alert('Standortbestimmung wird in einer zukünftigen Version verfügbar sein.');
    }

    showRecentStations() {
        this.showPage('search');
        // Here you could implement recent stations from localStorage
    }

    // Dashboard modal handlers
    setupModalEventHandlers() {
        // Add modal close handlers
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('cardConfigModal');
            if (e.target === modal) {
                this.closeCardConfig();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('cardConfigModal');
                if (modal.style.display === 'block') {
                    this.closeCardConfig();
                }
            }
        });

        // Close button handler
        const closeBtn = document.querySelector('#cardConfigModal .close');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeCardConfig();
        }
    }

    parseCountdown(countdown) {
        if (!countdown && countdown !== 0) return 999999;
        
        // If it's already a number, return it
        if (typeof countdown === 'number') return countdown;
        
        // Convert to string for processing
        const countdownStr = String(countdown);
        
        if (countdownStr === '0') return 0;
        
        // Handle formats like "5 Min", "12 Min", etc.
        const match = countdownStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 999999;
    }

    getLineColor(lineId) {
        // Find line data by lineId
        const lineData = this.linesData.find(line => line.lineId === lineId);
        if (lineData && lineData.color) {
            return lineData.color;
        }
        
        // Default color if not found
        return '#007bff';
    }

    // ===== AUTHENTICATION METHODS =====
    
    setupAuthEventListeners() {
        // Login button
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            this.openAuthModal('loginModal');
        });
        
        // Register button
        document.getElementById('registerBtn')?.addEventListener('click', () => {
            this.openAuthModal('registerModal');
            this.checkLocalDataForMigration();
        });
        
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        document.getElementById('resetPasswordForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordReset();
        });
    }
    
    setupAuthStateHandler() {
        // Override the auth state change handler
        this.auth.onAuthStateChange = (isLoggedIn, user) => {
            this.updateAuthUI();
            if (isLoggedIn && user) {
                this.handleUserLoggedIn(user);
            } else {
                this.handleUserLoggedOut();
            }
        };
    }
    
    updateAuthUI() {
        const guestStatus = document.getElementById('guestStatus');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        // Handle case where elements might not exist yet
        if (!guestStatus || !userInfo) return;
        
        if (this.auth.isLoggedIn && this.auth.user) {
            // Show user info
            guestStatus.style.display = 'none';
            userInfo.style.display = 'flex';
            if (userEmail) userEmail.textContent = this.auth.user.email;
            
            // Show logout button, hide login/register
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'flex';
        } else {
            // Show guest status
            guestStatus.style.display = 'flex';
            userInfo.style.display = 'none';
            
            // Show login/register buttons, hide logout
            if (loginBtn) loginBtn.style.display = 'flex';
            if (registerBtn) registerBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
        
        // Update usage warnings
        this.updateUsageWarnings();
    }
    
    updateUsageWarnings() {
        const usageWarning = document.getElementById('usageWarning');
        const usageWarningText = document.getElementById('usageWarningText');
        
        if (!this.auth.isLoggedIn) {
            const limits = this.auth.checkUsageLimits();
            if (!limits.withinLimits) {
                usageWarning.style.display = 'flex';
                usageWarningText.textContent = limits.reason;
            } else {
                usageWarning.style.display = 'none';
            }
        } else {
            usageWarning.style.display = 'none';
        }
    }
    
    checkUsageLimits() {
        if (this.auth.isLoggedIn) {
            return { canAdd: true }; // No limits for authenticated users
        }
        
        return this.auth.checkUsageLimits();
    }
    
    checkLocalDataForMigration() {
        const localCards = JSON.parse(localStorage.getItem('wien_opnv_dashboard_cards') || '[]');
        const migrationOption = document.getElementById('migrationOption');
        const migrationHint = document.getElementById('migrationHint');
        
        if (localCards.length > 0) {
            migrationOption.style.display = 'block';
            migrationHint.textContent = `${localCards.length} gespeicherte Karten werden übertragen`;
        } else {
            migrationOption.style.display = 'none';
        }
    }
    
    openAuthModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'block';
        }
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showNotification('Bitte füllen Sie alle Felder aus.', 'error');
            return;
        }
        
        const result = await this.auth.login(email, password);
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            this.closeAuthModal('loginModal');
        } else {
            this.showNotification(result.message, 'error');
        }
    }
    
    async handleRegister() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerPasswordConfirm').value;
        const migrateData = document.getElementById('migrateData').checked;
        
        if (!email || !password || !confirmPassword) {
            this.showNotification('Bitte füllen Sie alle Felder aus.', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showNotification('Passwörter stimmen nicht überein.', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('Passwort muss mindestens 6 Zeichen lang sein.', 'error');
            return;
        }
        
        const result = await this.auth.register(email, password);
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            this.closeAuthModal('registerModal');
            
            // If user is logged in and wants to migrate data
            if (this.auth.isLoggedIn && migrateData) {
                setTimeout(() => this.handleDataMigration(), 1000);
            }
        } else {
            this.showNotification(result.message, 'error');
        }
    }
    
    async handlePasswordReset() {
        const email = document.getElementById('resetEmail').value;
        
        if (!email) {
            this.showNotification('Bitte geben Sie Ihre E-Mail-Adresse ein.', 'error');
            return;
        }
        
        const result = await this.auth.resetPassword(email);
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            this.closeAuthModal('resetPasswordModal');
        } else {
            this.showNotification(result.message, 'error');
        }
    }
    
    async handleLogout() {
        if (confirm('Möchten Sie sich wirklich abmelden?')) {
            const result = await this.auth.logout();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
            } else {
                this.showNotification(result.message, 'error');
            }
        }
    }
    
    async handleUserLoggedIn(user) {
        console.log('User logged in:', user);
        
        // Reload dashboard cards from user account
        await this.loadAndRenderDashboard();
    }
    
    async handleUserLoggedOut() {
        console.log('User logged out');
        
        // Reload dashboard cards from localStorage
        await this.loadAndRenderDashboard();
    }
    
    async handleDataMigration() {
        try {
            const result = await this.userDataManager.migrateLocalStorageData();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                // Reload dashboard to show migrated data
                await this.loadAndRenderDashboard();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Fehler bei der Datenübertragung: ' + error.message, 'error');
        }
    }
    
    async loadAndRenderDashboard() {
        // Reload cards
        this.dashboardCards = await this.loadDashboardCards();
        
        // Re-render dashboard if on start page
        if (this.currentPage === 'start') {
            await this.loadDashboard();
        }
        
        // Update usage warnings
        this.updateUsageWarnings();
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }
    // Helper function to determine vehicle type from line number
    getVehicleType(lineNumber) {
        if (!lineNumber) return 'tram';
        
        const line = lineNumber.toString().toLowerCase();
        
        // U-Bahn (Metro)
        if (line.startsWith('u')) {
            return 'metro';
        }
        
        // S-Bahn (Suburban train)
        if (line.startsWith('s')) {
            return 'train';
        }
        
        // Bus lines (numbers 1A-99A, or numbers > 100)
        if (line.includes('a') || parseInt(line) > 100) {
            return 'bus';
        }
        
        // Night buses (N prefix)
        if (line.startsWith('n')) {
            return 'bus';
        }
        
        // Default: Tram for everything else (1-99)
        return 'tram';
    }
    
}

// Global auth modal functions
window.closeAuthModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        // Clear form data
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
};

window.switchToRegister = function() {
    window.closeAuthModal('loginModal');
    window.app.openAuthModal('registerModal');
    window.app.checkLocalDataForMigration();
};

window.switchToLogin = function() {
    window.closeAuthModal('registerModal');
    window.app.openAuthModal('loginModal');
};

window.showForgotPassword = function() {
    window.closeAuthModal('loginModal');
    window.app.openAuthModal('resetPasswordModal');
    
    // Pre-fill email if available
    const loginEmail = document.getElementById('loginEmail').value;
    if (loginEmail) {
        document.getElementById('resetEmail').value = loginEmail;
    }
};

// App initialisieren
const app = new WienOPNVApp();
window.app = app;
