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
            this.setupEventListeners();
            this.showWelcomeMessage();
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
            searchResults.innerHTML = '';
            return;
        }

        const filteredStations = this.stations.filter(station =>
            station.name.toLowerCase().includes(query.toLowerCase())
        );

        this.displaySearchResults(filteredStations);
    }

    displaySearchResults(stations) {
        const searchResults = document.getElementById('searchResults');
        
        if (!searchResults) return;
        
        if (stations.length === 0) {
            searchResults.innerHTML = '<div class="no-data">Keine Stationen gefunden</div>';
            return;
        }

        const html = stations.map(station => `
            <div class="search-result-item" onclick="app.selectStation('${station.diva}')">
                <div class="station-name">${station.name}</div>
                <div class="station-info">
                    <span class="rbl-count">${station.rbl_count} RBL-Nummern</span>
                    <span class="municipality">${station.municipality}</span>
                </div>
            </div>
        `).join('');

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
                                direction: line.towards || departure.destination || 'Unbekannte Richtung',
                                minutesUntil: minutesUntil,
                                scheduledTime: scheduledTime,
                                realTime: realTime,
                                delay: delay,
                                realtime: departure.departureTime && departure.departureTime.timeReal !== undefined,
                                type: type,
                                color: color,
                                platform: line.platform || departure.vehicle?.platform || null,
                                barrier: line.barrierFree || false
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
                        <span class="line-badge line-${firstDeparture.type} ${this.getLineBadgeClass(firstDeparture.line, firstDeparture.type)}">
                            ${firstDeparture.line}
                        </span>
                        <span class="line-type">${this.getLineTypeText(firstDeparture.type)}</span>
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

    loadStartPage() {
        const favoritesPreview = document.getElementById('favoritesPreview');
        if (favoritesPreview) {
            if (this.favorites && this.favorites.length === 0) {
                favoritesPreview.innerHTML = '<p class="text-secondary">Noch keine Favoriten hinzugefügt</p>';
            } else if (this.favorites) {
                const previewCount = Math.min(3, this.favorites.length);
                const preview = this.favorites.slice(0, previewCount);
                favoritesPreview.innerHTML = preview.map(fav => `
                    <div class="station-item" onclick="app.selectStationFromFavorite('${fav.diva}')">
                        <span class="station-name">${fav.name}</span>
                        <span class="station-rbl">${fav.rbl_count} RBL</span>
                    </div>
                `).join('');
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
                        <div>
                            <span class="station-name">${fav.name}</span>
                            <div class="station-rbl">${fav.rbl_count} RBL-Nummern</div>
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); app.removeFromFavorites('${fav.diva}')">
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

    addToFavorites() {
        if (!this.selectedStation) return;
        
        const exists = this.favorites.some(fav => fav.diva === this.selectedStation.diva);
        if (exists) {
            this.removeFromFavorites(this.selectedStation.diva);
        } else {
            this.favorites.push(this.selectedStation);
            this.saveFavorites();
            this.updateFavoriteButton();
        }
    }

    removeFromFavorites(diva) {
        this.favorites = this.favorites.filter(fav => fav.diva !== diva);
        this.saveFavorites();
        
        if (this.currentPage === 'favorites') {
            this.loadFavoritesPage();
        }
        if (this.selectedStation && this.selectedStation.diva === diva) {
            this.updateFavoriteButton();
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
        this.selectStation(diva);
        this.showPage('search');
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

    // Quick Actions
    showNearbyStations() {
        alert('Standortbestimmung wird in einer zukünftigen Version verfügbar sein.');
    }

    showRecentStations() {
        this.showPage('search');
        // Here you could implement recent stations from localStorage
    }
}

// App initialisieren
const app = new WienOPNVApp();
window.app = app;
