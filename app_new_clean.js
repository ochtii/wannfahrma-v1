class WienOPNVApp {
    constructor() {
        // Initialize core properties
        this.currentPage = 'search';
        this.selectedStation = null;
        this.currentStationLines = new Map();
        this.cardRefreshIntervals = {};
        this.cardRotationIntervals = {};
        this.currentEditingCard = null;
        this.isEditMode = false;
        
        // Display settings
        this.displaySettings = {
            hideEmptyCards: false,
            timeDisplayOptions: {
                remainingTime: true,
                expectedTime: false,
                actualTime: false,
                difference: false
            }
        };
        
        // Initialize app
        this.init();
    }

    async init() {
        console.log('🚀 Wien ÖPNV App starting...');
        
        // Load settings
        this.loadDisplaySettings();
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup card modal
        this.setupCardConfigModal();
        
        // Load initial page
        this.loadSearchPage();
        
        console.log('✅ Wien ÖPNV App initialized');
    }

    // NAVIGATION SYSTEM
    setupNavigation() {
        const navItems = document.querySelectorAll('[data-page]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });
    }

    navigateToPage(page) {
        console.log(`📍 Navigating to: ${page}`);
        
        // Update active nav item
        document.querySelectorAll('[data-page]').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });
        
        // Show target page
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.style.display = 'block';
        }
        
        this.currentPage = page;
        
        // Load page content
        switch (page) {
            case 'search':
                this.loadSearchPage();
                break;
            case 'dashboard':
                this.loadDashboardPage();
                break;
            case 'favorites':
                this.loadFavoritesPage();
                break;
            case 'settings':
                this.loadSettingsPage();
                break;
        }
    }

    // SEARCH PAGE
    loadSearchPage() {
        console.log('🔍 Loading search page');
        // Search functionality is already implemented in HTML
    }

    // DASHBOARD PAGE
    async loadDashboardPage() {
        console.log('📊 Loading dashboard page');
        await this.renderDashboard();
    }

    async renderDashboard() {
        const cards = this.loadDashboardCards();
        const dashboardGrid = document.getElementById('dashboardGrid');
        const emptyState = document.getElementById('dashboardEmpty');
        
        // Clear existing cards
        if (dashboardGrid) {
            dashboardGrid.innerHTML = '';
        }
        
        if (cards.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (dashboardGrid) dashboardGrid.style.display = 'none';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (dashboardGrid) dashboardGrid.style.display = 'grid';
        
        // Render each card
        for (const card of cards) {
            await this.renderDashboardCard(card);
        }
        
        // Update edit mode display
        this.updateEditModeDisplay();
    }

    async renderDashboardCard(cardData) {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) return;
        
        // Create card element
        const card = document.createElement('div');
        card.className = `dashboard-card ${cardData.size || 'medium'}`;
        card.id = `card-${cardData.id}`;
        card.setAttribute('data-card-id', cardData.id);
        
        // Card HTML structure
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${cardData.title}</h3>
                <div class="card-controls" style="display: none;">
                    <button onclick="app.editDashboardCard('${cardData.id}')" class="edit-card-btn" title="Bearbeiten">
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
        
        // Load card data
        await this.loadCardDepartures(cardData);
        
        // Setup auto-refresh
        this.setupCardAutoRefresh(cardData);
        
        return card;
    }

    async loadCardDepartures(cardData) {
        console.log(`🚌 Loading departures for: ${cardData.title}`);
        
        const card = document.getElementById(`card-${cardData.id}`);
        if (!card) return;
        
        const contentElement = card.querySelector('.card-content');
        
        try {
            // Collect departures from all RBLs where this line stops
            const allDepartures = [];
            
            if (cardData.lineRbls && cardData.lineRbls.length > 0) {
                for (const rbl of cardData.lineRbls) {
                    try {
                        const rblDepartures = await this.fetchDeparturesForRBL(rbl);
                        if (rblDepartures && rblDepartures.length > 0) {
                            // Filter for the specific line and direction
                            const filteredDepartures = rblDepartures.filter(dep => 
                                dep.line === cardData.line && dep.towards === cardData.direction
                            );
                            allDepartures.push(...filteredDepartures);
                        }
                    } catch (error) {
                        console.warn(`Failed to load RBL ${rbl}:`, error);
                    }
                }
            }
            
            // Sort by countdown and limit
            allDepartures.sort((a, b) => a.countdown - b.countdown);
            const limitedDepartures = allDepartures.slice(0, cardData.departureCount || 10);
            
            if (limitedDepartures.length > 0) {
                this.renderCardContent(card, cardData, limitedDepartures);
            } else {
                this.renderEmptyCard(contentElement, cardData);
            }
        } catch (error) {
            console.error(`Error loading departures for ${cardData.title}:`, error);
            contentElement.innerHTML = `
                <div class="error">
                    <div>Fehler beim Laden</div>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    renderCardContent(card, cardData, departures) {
        const displayMode = cardData.displayMode || 'multi';
        
        if (displayMode === 'single') {
            this.renderSingleRotatingMode(card, cardData, departures);
        } else {
            this.renderMultiMode(card, cardData, departures);
        }
    }

    renderMultiMode(card, cardData, departures) {
        const contentElement = card.querySelector('.card-content');
        
        const departureItems = departures.map(dep => {
            const timeDisplay = this.formatDepartureTime(dep);
            return `
                <div class="departure-item">
                    <div class="departure-line">${dep.line}</div>
                    <div class="departure-direction">${dep.towards}</div>
                    <div class="departure-time-display">
                        ${timeDisplay}
                    </div>
                </div>
            `;
        }).join('');
        
        contentElement.innerHTML = `
            <div class="departures-list">
                ${departureItems}
            </div>
        `;
    }

    renderSingleRotatingMode(card, cardData, departures) {
        const contentElement = card.querySelector('.card-content');
        const rotationInterval = (cardData.rotationInterval || 5) * 1000;
        
        // Clear existing rotation
        if (card.rotationInterval) {
            clearInterval(card.rotationInterval);
        }
        
        let currentIndex = 0;
        
        const updateContent = () => {
            if (departures.length === 0) return;
            
            const dep = departures[currentIndex % departures.length];
            const timeDisplay = this.formatDepartureTime(dep);
            const nextSwitch = rotationInterval / 1000;
            
            contentElement.innerHTML = `
                <div class="single-departure-display">
                    <div class="departure-item-large">
                        <div class="departure-line-large">${dep.line}</div>
                        <div class="departure-direction-large">${dep.towards}</div>
                        <div class="departure-time-large">
                            ${timeDisplay}
                        </div>
                    </div>
                    <div class="rotation-indicator">
                        <div class="rotation-progress" style="animation: rotationProgress ${nextSwitch}s linear;"></div>
                        <div class="rotation-info">
                            ${currentIndex + 1} / ${departures.length}
                            <span class="next-switch">Nächste in ${nextSwitch}s</span>
                        </div>
                    </div>
                </div>
            `;
            
            currentIndex++;
        };
        
        // Initial render and setup rotation
        updateContent();
        card.rotationInterval = setInterval(updateContent, rotationInterval);
        
        // Store for cleanup
        this.cardRotationIntervals[cardData.id] = card.rotationInterval;
    }

    renderEmptyCard(contentElement, cardData) {
        if (this.displaySettings.hideEmptyCards) {
            contentElement.parentElement.style.display = 'none';
        } else {
            contentElement.innerHTML = `
                <div class="no-departures">
                    <div class="no-departures-icon">🚫</div>
                    <div class="no-departures-text">Keine Abfahrten</div>
                    <div class="no-departures-subtext">${cardData.line} → ${cardData.direction}</div>
                </div>
            `;
        }
    }

    formatDepartureTime(departure) {
        const settings = this.displaySettings.timeDisplayOptions;
        const elements = [];
        
        if (settings.remainingTime && departure.countdown !== undefined) {
            const minutes = Math.max(0, departure.countdown);
            elements.push(`<span class="time-remaining">${minutes} min</span>`);
        }
        
        if (settings.expectedTime && departure.departureTime) {
            elements.push(`<span class="time-expected">${departure.departureTime.planned}</span>`);
        }
        
        if (settings.actualTime && departure.departureTime?.real) {
            elements.push(`<span class="time-actual">${departure.departureTime.real}</span>`);
        }
        
        if (settings.difference && departure.delay !== undefined) {
            const delayClass = departure.delay > 0 ? 'delay-positive' : departure.delay < 0 ? 'delay-negative' : 'delay-none';
            elements.push(`<span class="time-difference ${delayClass}">+${departure.delay}</span>`);
        }
        
        return elements.length > 0 ? elements.join(' ') : '<span class="time-remaining">0 min</span>';
    }

    setupCardAutoRefresh(cardData) {
        const intervalMs = (cardData.refreshInterval || 30) * 1000;
        
        if (intervalMs > 0) {
            // Clear existing interval
            if (this.cardRefreshIntervals[cardData.id]) {
                clearInterval(this.cardRefreshIntervals[cardData.id]);
            }
            
            // Set new interval
            this.cardRefreshIntervals[cardData.id] = setInterval(() => {
                this.loadCardDepartures(cardData);
            }, intervalMs);
        }
    }

    // CARD MANAGEMENT
    addDashboardCard(existingCard = null) {
        console.log('🎯 Opening card modal:', existingCard ? 'Edit mode' : 'Add mode');
        
        this.currentEditingCard = existingCard;
        this.selectedStation = null;
        this.currentStationLines = new Map();
        
        // Reset form
        const form = document.getElementById('cardConfigForm');
        if (form) form.reset();
        
        // Clear sections
        const stationResults = document.getElementById('cardStationResults');
        const linesSection = document.getElementById('cardLinesSection');
        if (stationResults) stationResults.style.display = 'none';
        if (linesSection) linesSection.style.display = 'none';
        
        // Set title
        const title = document.getElementById('cardConfigTitle');
        if (title) title.textContent = existingCard ? 'Karte bearbeiten' : 'Neue Dashboard-Karte';
        
        // Pre-fill if editing
        if (existingCard) {
            this.prefillCardForm(existingCard);
        }
        
        // Show modal
        document.getElementById('cardConfigModal').style.display = 'block';
    }

    prefillCardForm(existingCard) {
        const elements = {
            cardTitle: document.getElementById('cardTitle'),
            cardSize: document.getElementById('cardSize'),
            cardDepartureCount: document.getElementById('cardDepartureCount'),
            cardRefreshInterval: document.getElementById('cardRefreshInterval'),
            cardStation: document.getElementById('cardStation'),
            cardDisplayMode: document.getElementById('cardDisplayMode'),
            cardRotationInterval: document.getElementById('cardRotationInterval'),
            rotationGroup: document.getElementById('cardRotationGroup')
        };
        
        if (elements.cardTitle) elements.cardTitle.value = existingCard.title;
        if (elements.cardSize) elements.cardSize.value = existingCard.size || 'medium';
        if (elements.cardDepartureCount) elements.cardDepartureCount.value = existingCard.departureCount || 10;
        if (elements.cardRefreshInterval) elements.cardRefreshInterval.value = existingCard.refreshInterval || 30;
        if (elements.cardStation) elements.cardStation.value = existingCard.stationName;
        if (elements.cardDisplayMode) elements.cardDisplayMode.value = existingCard.displayMode || 'multi';
        if (elements.cardRotationInterval) elements.cardRotationInterval.value = existingCard.rotationInterval || 5;
        
        // Show/hide rotation settings
        if (elements.rotationGroup) {
            elements.rotationGroup.style.display = (existingCard.displayMode === 'single') ? 'block' : 'none';
        }
        
        // Set station and load lines
        this.selectedStation = {
            name: existingCard.stationName,
            title: existingCard.stationName,
            municipality: existingCard.municipality || '',
            rbls: existingCard.stationRbls || existingCard.lineRbls || []
        };
        
        this.loadStationLines(this.selectedStation).then(() => {
            this.preselectLineInDropdown(existingCard);
        });
    }

    preselectLineInDropdown(existingCard) {
        const linesSection = document.getElementById('cardLinesSection');
        const linesSelect = document.getElementById('cardLinesSelect');
        
        if (linesSection) linesSection.style.display = 'block';
        
        if (linesSelect && this.currentStationLines.has(existingCard.stationName)) {
            const lines = this.currentStationLines.get(existingCard.stationName);
            lines.forEach(lineData => {
                if (lineData.line === existingCard.line && lineData.direction === existingCard.direction) {
                    const option = Array.from(linesSelect.options).find(opt => {
                        if (!opt.value) return false;
                        try {
                            const data = JSON.parse(opt.value);
                            return data.line === existingCard.line && data.direction === existingCard.direction;
                        } catch {
                            return false;
                        }
                    });
                    if (option) option.selected = true;
                }
            });
        }
    }

    editDashboardCard(cardId) {
        const card = this.getDashboardCard(cardId);
        if (card) {
            this.addDashboardCard(card);
        }
    }

    removeDashboardCard(cardId) {
        console.log(`🗑️ Remove card: ${cardId}`);
        
        const cards = this.loadDashboardCards();
        const cardToRemove = cards.find(c => c.id === cardId);
        
        if (!cardToRemove) return;
        
        if (confirm(`Möchten Sie die Karte "${cardToRemove.title}" wirklich entfernen?`)) {
            // Clear intervals
            if (this.cardRefreshIntervals[cardId]) {
                clearInterval(this.cardRefreshIntervals[cardId]);
                delete this.cardRefreshIntervals[cardId];
            }
            if (this.cardRotationIntervals[cardId]) {
                clearInterval(this.cardRotationIntervals[cardId]);
                delete this.cardRotationIntervals[cardId];
            }
            
            // Remove from storage
            const updatedCards = cards.filter(c => c.id !== cardId);
            this.saveDashboardCards(updatedCards);
            
            // Re-render dashboard
            this.renderDashboard();
        }
    }

    getDashboardCard(cardId) {
        const cards = this.loadDashboardCards();
        return cards.find(c => c.id === cardId);
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.updateEditModeDisplay();
    }

    updateEditModeDisplay() {
        const editButton = document.getElementById('editModeToggle');
        const cards = document.querySelectorAll('.dashboard-card');
        
        if (editButton) {
            editButton.textContent = this.isEditMode ? 'Bearbeitung beenden' : 'Bearbeiten';
            editButton.classList.toggle('active', this.isEditMode);
        }
        
        cards.forEach(card => {
            const controls = card.querySelector('.card-controls');
            if (controls) {
                controls.style.display = this.isEditMode ? 'flex' : 'none';
            }
        });
    }

    // CARD CONFIG MODAL
    setupCardConfigModal() {
        const form = document.getElementById('cardConfigForm');
        const stationInput = document.getElementById('cardStation');
        const stationResults = document.getElementById('cardStationResults');
        const displayModeSelect = document.getElementById('cardDisplayMode');
        const rotationGroup = document.getElementById('cardRotationGroup');
        
        // Station search
        if (stationInput) {
            stationInput.oninput = (e) => {
                const query = e.target.value.trim();
                if (query.length < 2) {
                    if (stationResults) stationResults.style.display = 'none';
                    return;
                }
                
                this.searchAndDisplayStations(query);
            };
        }
        
        // Display mode toggle
        if (displayModeSelect && rotationGroup) {
            displayModeSelect.onchange = (e) => {
                rotationGroup.style.display = e.target.value === 'single' ? 'block' : 'none';
            };
        }
        
        // Form submission
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.saveDashboardCard();
            };
        }
        
        this.selectedStation = null;
        this.currentStationLines = new Map();
    }

    searchAndDisplayStations(query) {
        const stationResults = document.getElementById('cardStationResults');
        if (!stationResults) return;
        
        const filteredStations = this.searchStations(query);
        
        if (filteredStations.length > 0) {
            stationResults.innerHTML = '';
            stationResults.style.display = 'block';
            
            filteredStations.slice(0, 8).forEach(station => {
                const resultItem = document.createElement('div');
                resultItem.className = 'station-result-item';
                resultItem.innerHTML = `
                    <div class="station-name">${station.name}</div>
                    <div class="station-municipality">${station.municipality}</div>
                `;
                
                resultItem.onclick = () => {
                    this.selectStation(station);
                    stationResults.style.display = 'none';
                };
                
                stationResults.appendChild(resultItem);
            });
        } else {
            stationResults.style.display = 'none';
        }
    }

    selectStation(station) {
        console.log('🎯 Station selected:', station);
        
        this.selectedStation = station;
        const stationInput = document.getElementById('cardStation');
        const stationData = document.getElementById('cardStationData');
        const linesSection = document.getElementById('cardLinesSection');
        
        if (stationInput) stationInput.value = station.name;
        if (stationData) stationData.value = JSON.stringify(station);
        if (linesSection) linesSection.style.display = 'block';
        
        this.loadStationLines(station);
    }

    async loadStationLines(station) {
        try {
            console.log(`🚉 Loading lines for station: ${station.name}`);
            
            const allRBLs = station.rbls || [];
            const stationLines = [];
            
            for (const rbl of allRBLs) {
                try {
                    const rblNumber = Math.floor(parseFloat(rbl));
                    const response = await fetch(`/api/departures/${rblNumber}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.data && data.data.monitors) {
                            data.data.monitors.forEach(monitor => {
                                const line = monitor.lines[0]?.name || 'Unknown';
                                const direction = monitor.lines[0]?.towards || 'Unknown';
                                
                                const exists = stationLines.find(l => 
                                    l.line === line && l.direction === direction
                                );
                                
                                if (!exists) {
                                    stationLines.push({
                                        line: line,
                                        direction: direction,
                                        rbls: [rblNumber],
                                        stationRbls: allRBLs,
                                        lineData: monitor.lines[0]
                                    });
                                } else {
                                    if (!exists.rbls.includes(rblNumber)) {
                                        exists.rbls.push(rblNumber);
                                    }
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load RBL ${rbl}:`, error);
                }
            }
            
            this.currentStationLines.set(station.name, stationLines);
            this.updateLinesDropdown(station.name);
            
            console.log(`📊 Loaded ${stationLines.length} lines for ${station.name}`);
        } catch (error) {
            console.error('Error loading station lines:', error);
        }
    }

    updateLinesDropdown(stationName) {
        const linesSelect = document.getElementById('cardLinesSelect');
        if (!linesSelect || !this.currentStationLines.has(stationName)) return;
        
        const lines = this.currentStationLines.get(stationName);
        linesSelect.innerHTML = '<option value="">Bitte wählen...</option>';
        
        lines.forEach(lineData => {
            const option = document.createElement('option');
            option.value = JSON.stringify(lineData);
            option.textContent = `${lineData.line} - ${lineData.direction}`;
            linesSelect.appendChild(option);
        });
    }

    saveDashboardCard() {
        const stationData = document.getElementById('cardStationData').value;
        const selectedLine = document.getElementById('cardLinesSelect').value;
        
        if (!stationData) {
            alert('Bitte wählen Sie eine Station aus.');
            return;
        }
        
        if (!selectedLine) {
            alert('Bitte wählen Sie eine Linie und Richtung aus.');
            return;
        }
        
        const station = JSON.parse(stationData);
        const lineData = JSON.parse(selectedLine);
        
        // Get form values
        const cardData = {
            id: this.currentEditingCard ? this.currentEditingCard.id : Date.now().toString(),
            title: document.getElementById('cardTitle')?.value || `${station.name} - ${lineData.line}`,
            stationName: station.name,
            stationRbls: lineData.stationRbls || station.rbls || [],
            lineRbls: lineData.rbls || [],
            line: lineData.line,
            lineId: lineData.lineId,
            direction: lineData.direction,
            size: document.getElementById('cardSize')?.value || 'medium',
            departureCount: parseInt(document.getElementById('cardDepartureCount')?.value) || 10,
            refreshInterval: parseInt(document.getElementById('cardRefreshInterval')?.value) || 30,
            displayMode: document.getElementById('cardDisplayMode')?.value || 'multi',
            rotationInterval: parseInt(document.getElementById('cardRotationInterval')?.value) || 5,
            position: this.currentEditingCard ? this.currentEditingCard.position : { x: 0, y: 0 }
        };
        
        console.log(`💾 Saving card: ${cardData.title}`);
        
        let cards = this.loadDashboardCards();
        
        if (this.currentEditingCard) {
            const index = cards.findIndex(c => c.id === this.currentEditingCard.id);
            if (index !== -1) {
                cards[index] = cardData;
            }
        } else {
            cards.push(cardData);
        }
        
        this.saveDashboardCards(cards);
        this.renderDashboard();
        
        // Close modal
        document.getElementById('cardConfigModal').style.display = 'none';
        this.currentEditingCard = null;
    }

    closeCardConfig() {
        document.getElementById('cardConfigModal').style.display = 'none';
        this.currentEditingCard = null;
    }

    // DATA FETCHING
    async fetchDeparturesForRBL(rbl) {
        try {
            const response = await fetch(`/api/departures/${rbl}`);
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.monitors) {
                    return data.data.monitors.flatMap(monitor => 
                        monitor.lines.map(line => ({
                            line: line.name,
                            towards: line.towards,
                            countdown: line.departures.departure[0]?.departureTime?.countdown || 0,
                            departureTime: line.departures.departure[0]?.departureTime || {},
                            delay: line.departures.departure[0]?.departureTime?.delay || 0
                        }))
                    );
                }
            }
        } catch (error) {
            console.error(`Error fetching departures for RBL ${rbl}:`, error);
        }
        return [];
    }

    searchStations(query) {
        // This would normally search through loaded station data
        // For now, return mock data for testing
        const mockStations = [
            { name: 'Schottentor', municipality: 'Wien', rbls: ['2172', '2173'] },
            { name: 'Stephansplatz', municipality: 'Wien', rbls: ['3852', '3853'] },
            { name: 'Karlsplatz', municipality: 'Wien', rbls: ['4645', '4646'] }
        ];
        
        return mockStations.filter(station => 
            station.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    // STORAGE
    loadDashboardCards() {
        try {
            const saved = localStorage.getItem('wien_opnv_dashboard_cards');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading dashboard cards:', error);
            return [];
        }
    }

    saveDashboardCards(cards) {
        try {
            localStorage.setItem('wien_opnv_dashboard_cards', JSON.stringify(cards));
            console.log(`💾 Saved ${cards.length} cards to storage`);
        } catch (error) {
            console.error('Error saving dashboard cards:', error);
        }
    }

    loadDisplaySettings() {
        try {
            const saved = localStorage.getItem('wien_opnv_display_settings');
            if (saved) {
                this.displaySettings = { ...this.displaySettings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error loading display settings:', error);
        }
    }

    saveDisplaySettings() {
        try {
            localStorage.setItem('wien_opnv_display_settings', JSON.stringify(this.displaySettings));
        } catch (error) {
            console.error('Error saving display settings:', error);
        }
    }

    // SETTINGS PAGE
    loadSettingsPage() {
        console.log('⚙️ Loading settings page');
        this.renderSettings();
    }

    renderSettings() {
        // Update time display checkboxes
        const timeOptions = this.displaySettings.timeDisplayOptions;
        const checkboxes = {
            'timeDisplayRemaining': timeOptions.remainingTime,
            'timeDisplayExpected': timeOptions.expectedTime,
            'timeDisplayActual': timeOptions.actualTime,
            'timeDisplayDifference': timeOptions.difference
        };
        
        Object.entries(checkboxes).forEach(([id, checked]) => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = checked;
        });
        
        // Update hide empty cards
        const hideEmptyCheckbox = document.getElementById('hideEmptyCards');
        if (hideEmptyCheckbox) hideEmptyCheckbox.checked = this.displaySettings.hideEmptyCards;
    }

    updateTimeDisplayOption(option, enabled) {
        this.displaySettings.timeDisplayOptions[option] = enabled;
        this.saveDisplaySettings();
        this.renderDashboard(); // Refresh to show changes
    }

    updateHideEmptyCards(enabled) {
        this.displaySettings.hideEmptyCards = enabled;
        this.saveDisplaySettings();
        this.renderDashboard(); // Refresh to show changes
    }

    // FAVORITES PAGE
    loadFavoritesPage() {
        console.log('⭐ Loading favorites page');
        // Favorites functionality would go here
    }
}

// Initialize app
const app = new WienOPNVApp();
window.app = app;
