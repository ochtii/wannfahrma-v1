class WienOPNVApp {
    constructor() {
        this.stations = [];
        this.linesData = [];
        this.selectedStation = null;
        this.autoRefreshInterval = null;
        this.currentRBLs = [];
        
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
        const searchInput = document.getElementById('stationSearch');
        const clearBtn = document.getElementById('clearSearch');
        const refreshBtn = document.getElementById('refreshBtn');
        const autoRefreshCheckbox = document.getElementById('autoRefresh');

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

        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.addEventListener('change', (e) => {
                this.toggleAutoRefresh(e.target.checked);
            });
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
                <h3>${this.selectedStation.name}</h3>
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

    async loadDepartures() {
        if (this.currentRBLs.length === 0) return;

        this.showLoading();
        this.hideError();

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
        }
    }

    async fetchLiveDepartures(rbls) {
        const allDepartures = [];
        
        // Hole Daten für alle RBL-Nummern parallel (max 5 gleichzeitig)
        const batchSize = 5;
        for (let i = 0; i < rbls.length; i += batchSize) {
            const batch = rbls.slice(i, i + batchSize);
            const promises = batch.map(rbl => this.fetchDeparturesForRBL(rbl));
            const results = await Promise.allSettled(promises);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    allDepartures.push(...result.value);
                } else {
                    console.warn(`Fehler bei RBL ${batch[index]}:`, result.reason);
                }
            });
        }

        if (allDepartures.length === 0) {
            throw new Error('Keine Live-Daten verfügbar für diese Station');
        }

        // Sortiere nach Zeit und limitiere auf 20 Abfahrten
        return allDepartures
            .sort((a, b) => a.minutesUntil - b.minutesUntil)
            .slice(0, 20);
    }

    async fetchDeparturesForRBL(rbl) {
        try {
            // Verwende lokalen Proxy-Server um CORS-Probleme zu umgehen
            const proxyUrl = `http://localhost:3001/monitor?rbl=${rbl}`;
            
            console.log(`🔄 Hole Live-Daten für RBL ${rbl}...`);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message);
            }
            
            console.log(`✓ Live-Daten für RBL ${rbl} erhalten`);
            return this.parseWienerLinienData(data, rbl);
            
        } catch (error) {
            console.error(`❌ API-Fehler für RBL ${rbl}:`, error.message);
            
            // Bei API-Fehlern: Zeige Hinweis und verwende Fallback
            if (error.message.includes('fetch')) {
                console.warn('💡 Tipp: Starten Sie den API-Proxy mit: python api_proxy.py');
            }
            
            return this.generateFallbackData(rbl);
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
                            if (departure.departureTime && departure.departureTime.timePlanned) {
                                try {
                                    scheduledTime = new Date(departure.departureTime.timePlanned).toLocaleTimeString('de-AT', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
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
            
            return `
                <div class="departure-line-group">
                    <div class="line-header">
                        <span class="line-badge line-${firstDeparture.type}" style="background-color: ${firstDeparture.color}">
                            ${firstDeparture.line}
                        </span>
                        <span class="line-type">${this.getLineTypeText(firstDeparture.type)}</span>
                    </div>
                    <div class="departures-list">
                        ${lineDepartures.map(dep => `
                            <div class="departure-item">
                                <div class="departure-main">
                                    <div class="direction">${dep.direction}</div>
                                    <div class="time-info">
                                        <span class="countdown ${dep.minutesUntil <= 2 ? 'urgent' : ''}">${this.formatCountdown(dep.minutesUntil)}</span>
                                        <span class="scheduled-time">${dep.scheduledTime}</span>
                                        ${dep.realtime ? '<span class="realtime-indicator">●</span>' : ''}
                                    </div>
                                </div>
                                ${dep.platform ? `<div class="platform">Steig ${dep.platform}</div>` : ''}
                                <div class="rbl-info">RBL: ${dep.rbl}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        departuresContainer.innerHTML = html;
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

    formatCountdown(minutes) {
        if (minutes === 0) return 'Jetzt';
        if (minutes === 1) return '1 Min';
        return `${minutes} Min`;
    }

    showLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'block';
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

    hideError() {
        const errorElement = document.getElementById('error');
        if (errorElement) errorElement.style.display = 'none';
    }

    refreshDepartures() {
        if (this.selectedStation) {
            this.loadDepartures();
        }
    }

    toggleAutoRefresh(enabled) {
        if (enabled) {
            this.autoRefreshInterval = setInterval(() => {
                this.refreshDepartures();
            }, 30000); // Alle 30 Sekunden
            console.log('✓ Auto-Refresh aktiviert (30s)');
        } else {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }
            console.log('○ Auto-Refresh deaktiviert');
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
}

// App initialisieren
const app = new WienOPNVApp();
