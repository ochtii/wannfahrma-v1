class WienOPNVApp {
    constructor() {
        this.stations = [];
        this.linesData = [];
        this.selectedStation = null;
        this.autoRefreshInterval = null;
        this.currentRBLs = [];
        this.favorites = [];
        this.currentPage = 'search';
        this.settings = {
            darkMode: true,
            refreshInterval: 30
        };
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.loadData();
            this.loadSettings();
            this.loadFavorites();
            this.setupEventListeners();
            this.setupCardConfigModal();
            this.showWelcomeMessage();
            
            // Show the default start page from settings
            const defaultPage = this.settings.defaultStartPage || 'start';
            this.showPage(defaultPage);
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
        const autoRefreshToggle = document.getElementById('autoRefreshToggle');
        const refreshIntervalSelect = document.getElementById('refreshInterval');
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

        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.toggleAutoRefresh(e.target.checked);
            });
        }

        if (refreshIntervalSelect) {
            refreshIntervalSelect.addEventListener('change', (e) => {
                this.setRefreshInterval(parseInt(e.target.value));
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
        
        // Start auto-refresh if enabled
        if (this.settings.autoRefresh) {
            this.toggleAutoRefresh(true);
        }
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
                        ${this.renderDepartureItems(initialDepartures, 'visible')}
                        ${hiddenDepartures.length > 0 ? this.renderDepartureItems(hiddenDepartures, 'hidden', lineId) : ''}
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
            grouped[key].sort((a, b) => a.minutesUntil - b.minutesUntil);
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
    showPage(pageId) {
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
                this.loadStartPage();
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

    loadStartPage() {
        console.log('🏠 Loading Start Page...');
        
        this.isEditMode = false;
        this.currentEditingCard = null;
        this.cardRefreshIntervals = {};
        
        // Ensure stations are loaded before dashboard
        if (!this.stations || this.stations.length === 0) {
            console.log('📡 Loading stations for dashboard...');
            this.loadStations().then(() => {
                console.log('✅ Stations loaded, initializing dashboard...');
                this.loadDashboard();
            });
        } else {
            console.log('✅ Stations already loaded, initializing dashboard...');
            this.loadDashboard();
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
    repairCardManually(cardId, stationDiva) {
        const cards = this.loadDashboardCards();
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
        
        this.saveDashboardCards(cards);
        console.log(`✅ Card repaired with ${cards[cardIndex].rblNumbers.length} RBLs`);
        
        // Reload dashboard
        this.loadDashboard();
    }

    repairDashboardCards() {
        console.log('🔧 Repairing dashboard cards...');
        const cards = this.loadDashboardCards();
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
            this.saveDashboardCards(repairedCards);
            console.log('✅ Dashboard cards migrated to new RBL format');
        } else {
            console.log('✅ Dashboard cards are already in correct format');
        }
        
        return repairedCards;
    }

    loadDashboard() {
        const dashboardCards = this.loadDashboardCards();
        const dashboardGrid = document.getElementById('dashboardGrid');
        const dashboardEmpty = document.getElementById('dashboardEmpty');
        
        if (!dashboardGrid) return;
        
        console.log(`📊 Loading ${dashboardCards.length} dashboard cards`);
        if (dashboardCards.length > 0) {
            console.log('📋 Dashboard cards data:', dashboardCards);
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
            dashboardGrid.style.display = 'grid';
            dashboardEmpty.style.display = 'none';
            
            // Render cards sequentially and wait for each to load
            this.renderCardsSequentially(dashboardCards, 0);
        }
    }

    async renderCardsSequentially(cards, index) {
        if (index >= cards.length) return;
        
        const card = cards[index];
        console.log(`🔄 Rendering card ${index + 1}/${cards.length}: ${card.title}`);
        
        await this.renderDashboardCard(card);
        
        // Wait a bit before rendering next card to avoid API rate limits
        setTimeout(() => {
            this.renderCardsSequentially(cards, index + 1);
        }, 300);
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
    }

    loadDashboardCards() {
        const saved = localStorage.getItem('wien_opnv_dashboard_cards');
        return saved ? JSON.parse(saved) : [];
    }

    saveDashboardCards(cards) {
        localStorage.setItem('wien_opnv_dashboard_cards', JSON.stringify(cards));
    }

    addDashboardCard(existingCard = null) {
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
            document.getElementById('cardTitle').value = existingCard.title;
            document.getElementById('cardSize').value = existingCard.size;
            document.getElementById('cardDepartureCount').value = existingCard.departureCount;
            document.getElementById('cardRefreshInterval').value = existingCard.refreshInterval;
            document.getElementById('cardStation').value = existingCard.stationName;
            document.getElementById('cardStationData').value = JSON.stringify(existingCard.station);
            
            // Pre-fill station search if we have new format data
            if (existingCard.stationName && existingCard.rblNumber) {
                const cardStation = document.getElementById('cardStation');
                if (cardStation) cardStation.value = existingCard.stationName;
                
                this.selectedStation = {
                    name: existingCard.stationName,
                    title: existingCard.stationName,
                    municipality: existingCard.municipality || '',
                    rblNumbers: [existingCard.rblNumber]
                };
                
                // Show and populate RBL selection
                const rblSection = document.getElementById('lineDirectionSection');
                if (rblSection) {
                    rblSection.style.display = 'block';
                    
                    const rblSelect = document.getElementById('cardRblSelect');
                    if (rblSelect) {
                        rblSelect.innerHTML = `<option value="${existingCard.rblNumber}">${existingCard.stationName} (RBL: ${existingCard.rblNumber})</option>`;
                        rblSelect.value = existingCard.rblNumber;
                    }
                }
                
                // Show line/direction section if RBL is selected
                if (existingCard.line && existingCard.direction) {
                    this.showLineDirectionSelection();
                    
                    // Pre-populate line and direction when they load
                    this.loadLinesForRBL(existingCard.rblNumber).then(() => {
                        const lineSelect = document.getElementById('cardLineSelect');
                        const directionSelect = document.getElementById('cardDirectionSelect');
                        
                        // Set selected line
                        if (lineSelect && lineSelect.querySelector(`option[value="${existingCard.line}"]`)) {
                            lineSelect.value = existingCard.line;
                            
                            // Load and set directions for this line
                            this.loadDirectionsForLine(existingCard.rblNumber, existingCard.line).then(() => {
                                if (directionSelect && directionSelect.querySelector(`option[value="${existingCard.direction}"]`)) {
                                    directionSelect.value = existingCard.direction;
                                }
                            });
                        }
                    });
                }
            }
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
            size: 'medium',
            refreshInterval: 30
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
        };
        
        document.getElementById('cardSize').onchange = (e) => {
            this.currentCardConfig.size = e.target.value;
            this.updateCardPreview();
        };
        
        document.getElementById('cardRefreshInterval').onchange = (e) => {
            this.currentCardConfig.refreshInterval = parseInt(e.target.value);
            this.updateCardPreview();
        };
        
        // Form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveNewCardConfig();
        };
        
        // Initialize preview
        this.updateCardPreview();
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
            departureCount: 2
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
                    <label>Anzahl Abfahrten:</label>
                    <div class="departure-count-buttons">
                        ${[1, 2, 3].map(count => `
                            <button type="button" class="count-btn ${config.departureCount === count ? 'active' : ''}" 
                                    onclick="app.updateDepartureCount('${config.id}', ${count})">${count}</button>
                        `).join('')}
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
        
        // Update card size class
        if (cardPreview) {
            cardPreview.className = `dashboard-card preview-card ${this.currentCardConfig.size}`;
        }
        
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
        
        // Show configured departure lines
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
        
        previewContent.innerHTML = `
            <div class="departures-list">
                ${validLines.map((line, index) => `
                    <div class="departure-item preview-departure-item" data-line-id="${line.id}">
                        <div class="line-info">
                            <span class="line-number" style="background-color: ${this.getLineColor(line.line)}">${line.line}</span>
                            <span class="direction">${line.direction}</span>
                        </div>
                        <div class="departure-time">
                            <span class="countdown">-- Min</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Show footer
        if (previewFooter && previewFooterInfo) {
            previewFooter.style.display = 'flex';
            previewFooterInfo.textContent = `${this.currentCardConfig.station.name} • ${validLines.length} Linie${validLines.length !== 1 ? 'n' : ''}`;
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('saveCardBtn');
        if (!saveBtn) return;
        
        const hasStation = !!this.currentCardConfig.station;
        const hasValidLines = this.currentCardConfig.departureLines.some(line => line.line && line.direction);
        const canSave = hasStation && hasValidLines;
        
        saveBtn.disabled = !canSave;
        saveBtn.innerHTML = canSave 
            ? '<i class="fas fa-save"></i> Karte speichern'
            : '<i class="fas fa-exclamation-triangle"></i> Konfiguration unvollständig';
    }

    saveNewCardConfig() {
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
            id: Date.now().toString(),
            title: this.currentCardConfig.title || this.currentCardConfig.station.name,
            station: this.currentCardConfig.station,
            departureLines: validLines,
            size: this.currentCardConfig.size,
            refreshInterval: this.currentCardConfig.refreshInterval,
            position: this.getNextCardPosition()
        };
        
        // Save card to dashboard
        this.dashboardCards = this.dashboardCards || [];
        this.dashboardCards.push(cardData);
        this.saveDashboardCards();
        
        // Render new card
        this.renderDashboardCard(cardData);
        
        // Close modal and show success
        this.closeCardConfig();
        alert('✅ Dashboard-Karte wurde erfolgreich erstellt!');
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

    saveDashboardCards() {
        try {
            localStorage.setItem('dashboard_cards', JSON.stringify(this.dashboardCards));
        } catch (error) {
            console.error('Error saving dashboard cards:', error);
        }
    }

    loadDashboardCards() {
        try {
            const saved = localStorage.getItem('dashboard_cards');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading dashboard cards:', error);
            return [];
        }
    }

    saveCardConfig() {
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
        
        let cards = this.loadDashboardCards();
        
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
        
        this.saveDashboardCards(cards);
        this.closeCardConfig();
        this.loadDashboard();
    }

    closeCardConfig() {
        document.getElementById('cardConfigModal').style.display = 'none';
        this.currentEditingCard = null;
    }

    async renderDashboardCard(cardData) {
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
        
        // Set grid position based on size and available space
        this.setCardGridPosition(card, cardData);
        
        // Initial card structure
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${cardData.title}</h3>
                <div class="card-controls" style="display: none;">
                    <button onclick="app.addDashboardCard(app.getDashboardCard('${cardData.id}'))" class="edit-card-btn" title="Bearbeiten">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
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
        `;
        
        grid.appendChild(card);
        
        // Load departures and wait for completion
        await this.loadCardDepartures(cardData);
        
        // Setup auto-refresh after data is loaded
        this.setupCardAutoRefresh(cardData);
        
        return card;
    }

    setCardGridPosition(cardElement, cardData) {
        // Simple positioning - find next available space in grid
        // For now, let CSS Grid handle automatic placement
        // TODO: Implement drag-and-drop positioning
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
        
        if (!hasOldFormat && !hasNewFormat) {
            console.warn(`❌ Incomplete card configuration: ${cardData.title}`);
            contentElement.innerHTML = `
                <div class="error">
                    <div>Unvollständige Kartenkonfiguration</div>
                    <small>Keine Abfahrtszeilen konfiguriert</small>
                    <button onclick="app.addDashboardCard(app.getDashboardCard('${cardData.id}'))" style="margin-top: 10px; padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
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
                        const rblDepartures = await this.fetchDeparturesForRBL(departureLine.rbl);
                        if (rblDepartures && rblDepartures.length > 0) {
                            // Filter for specific line and direction
                            const filteredDepartures = rblDepartures.filter(dep => 
                                dep.line === departureLine.line && dep.towards === departureLine.direction
                            );
                            
                            // Take only the requested number of departures for this line
                            const limitedDepartures = filteredDepartures
                                .sort((a, b) => (a.minutesUntil || 0) - (b.minutesUntil || 0))
                                .slice(0, departureLine.departureCount);
                            
                            allDepartures.push(...limitedDepartures);
                        }
                    } catch (error) {
                        console.warn(`Failed to load departures for ${departureLine.line}:`, error);
                    }
                }
                
                if (allDepartures.length > 0) {
                    console.log(`✅ Loaded ${allDepartures.length} departures for ${cardData.title}`);
                    contentElement.innerHTML = this.renderCardDepartures(allDepartures, cardData);
                } else {
                    contentElement.innerHTML = `
                        <div class="error">
                            <div>Keine Abfahrten gefunden</div>
                            <small>Möglicherweise fahren gerade keine Fahrzeuge</small>
                        </div>
                    `;
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
                } else {
                    console.warn(`⚠️ No departures found for line ${cardData.line} direction ${cardData.direction}`);
                    contentElement.innerHTML = `
                        <div class="no-departures">
                            <div>Keine Abfahrten verfügbar</div>
                            <small>Linie ${cardData.line} → ${cardData.direction}</small>
                            <small>Station: ${cardData.stationName}</small>
                        </div>
                    `;
                }
            } else {
                console.warn(`⚠️ No departures received from any RBL`);
                contentElement.innerHTML = `
                    <div class="no-departures">
                        <div>Keine Abfahrten verfügbar</div>
                        <small>Station: ${cardData.stationName}</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error(`❌ Error loading departures for ${cardData.title}:`, error);
            contentElement.innerHTML = `
                <div class="error">
                    <div>Fehler beim Laden der Abfahrten</div>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    renderCardDepartures(departures, cardData) {
        const sortedDepartures = departures
            .sort((a, b) => {
                const timeA = this.parseCountdown(a.countdown);
                const timeB = this.parseCountdown(b.countdown);
                return timeA - timeB;
            })
            .slice(0, cardData.departureCount);
        
        // Generate footer based on card format
        let footerInfo = '';
        if (cardData.departureLines && cardData.departureLines.length > 0) {
            // New format - show station and line count
            const lineCount = cardData.departureLines.length;
            footerInfo = `
                <small>${cardData.stationName} (${lineCount} ${lineCount === 1 ? 'Linie' : 'Linien'})</small>
                <small>Update: ${new Date().toLocaleTimeString()}</small>
            `;
        } else {
            // Old format - show specific line and direction
            footerInfo = `
                <small>Linie ${cardData.line} → ${cardData.direction}</small>
                <small>RBL: ${cardData.rblNumber} | Update: ${new Date().toLocaleTimeString()}</small>
            `;
        }
        
        return `
            <div class="departures-list">
                ${sortedDepartures.map(dep => `
                    <div class="departure-item">
                        <div class="line-info">
                            <span class="line-number" style="background-color: ${this.getLineColor(dep.lineId)}">${dep.line}</span>
                            <span class="direction">${dep.towards}</span>
                        </div>
                        <div class="departure-time">
                            <span class="countdown">${dep.countdown}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="card-footer">
                ${footerInfo}
            </div>
        `;
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
        
        // Set new interval
        this.cardRefreshIntervals[cardData.id] = setInterval(() => {
            this.loadCardDepartures(cardData);
        }, cardData.refreshInterval * 1000);
    }

    getDashboardCard(cardId) {
        const cards = this.loadDashboardCards();
        return cards.find(c => c.id === cardId);
    }

    removeDashboardCard(cardId) {
        if (confirm('Möchten Sie diese Karte wirklich entfernen?')) {
            // Remove from DOM
            const cardElement = document.getElementById(`card-${cardId}`);
            if (cardElement) {
                cardElement.remove();
            }
            
            // Clear refresh interval
            if (this.cardRefreshIntervals && this.cardRefreshIntervals[cardId]) {
                clearInterval(this.cardRefreshIntervals[cardId]);
                delete this.cardRefreshIntervals[cardId];
            }
            
            // Remove from storage
            let cards = this.loadDashboardCards();
            cards = cards.filter(c => c.id !== cardId);
            this.saveDashboardCards(cards);
            
            // Update empty state
            this.updateDashboardEmptyState();
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const controls = document.querySelectorAll('.card-controls');
        const editBtn = document.getElementById('editDashboardBtn');
        
        if (this.isEditMode) {
            controls.forEach(ctrl => ctrl.style.display = 'flex');
            editBtn.textContent = 'Fertig';
            editBtn.classList.add('active');
        } else {
            controls.forEach(ctrl => ctrl.style.display = 'none');
            editBtn.textContent = 'Bearbeiten';
            editBtn.classList.remove('active');
        }
    }

    updateDashboardEmptyState() {
        const grid = document.getElementById('dashboardGrid');
        const emptyState = document.getElementById('dashboardEmptyState');
        
        if (grid.children.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
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
                        ${this.renderDepartureItems(initialDepartures, 'visible')}
                        ${hiddenDepartures.length > 0 ? this.renderDepartureItems(hiddenDepartures, 'hidden', lineId) : ''}
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

    toggleAutoRefresh(enabled) {
        this.settings.autoRefresh = enabled;
        this.saveSettings();
        
        if (enabled) {
            const intervalMs = this.settings.refreshInterval * 1000;
            
            this.autoRefreshInterval = setInterval(() => {
                this.refreshDepartures();
            }, intervalMs);
            console.log(`✓ Auto-Refresh aktiviert (${this.settings.refreshInterval}s)`);
        } else {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }
            console.log('○ Auto-Refresh deaktiviert');
        }
    }

    setRefreshInterval(seconds) {
        this.settings.refreshInterval = seconds;
        this.saveSettings();
        
        // Restart auto-refresh if it's enabled
        if (this.settings.autoRefresh) {
            this.toggleAutoRefresh(false);
            this.toggleAutoRefresh(true);
        }
        
        console.log(`⏱️ Refresh-Intervall geändert: ${seconds}s`);
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
}

// App initialisieren
const app = new WienOPNVApp();
window.app = app;
