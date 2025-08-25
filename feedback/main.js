// Modern feedback system JS (theme switcher, tab logic, form, API, etc.)

// --- Theme Management ---
const THEME_CONFIG = {
    dark: {
        gradient: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
        textColor: '#f0f0f0',
        attribute: 'dark'
    },
    light: {
        gradient: 'linear-gradient(135deg, #38b000 0%, #70e000 100%)',
        textColor: '#222',
        attribute: null
    }
};

function applyThemeStyles(themeConfig) {
    document.documentElement.style.setProperty('--bg-gradient', themeConfig.gradient);
    document.documentElement.style.setProperty('--text-color', themeConfig.textColor);
    if (themeConfig.attribute) {
        document.documentElement.setAttribute('data-theme', themeConfig.attribute);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

// Theme switching logic
function setTheme(theme) {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectiveTheme = (theme === 'system') ? (isSystemDark ? 'dark' : 'light') : theme;
    applyThemeStyles(THEME_CONFIG[effectiveTheme]);
    localStorage.setItem('theme', theme);
}
window.setTheme = setTheme;

window.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        setTheme(savedTheme);
        themeSelect.addEventListener('change', function() {
            setTheme(this.value);
        });
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (themeSelect.value === 'system') {
                setTheme('system');
            }
        });
    }
    
    // Initialize star rating
    window.currentRating = 0;
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.addEventListener('click', function() {
            window.currentRating = index + 1;
            updateStars();
            updateRatingText();
        });
        star.addEventListener('mouseover', function() {
            stars.forEach((s, i) => {
                s.style.color = i <= index ? '#ffc107' : '#ddd';
            });
        });
        star.addEventListener('mouseout', function() {
            updateStars();
        });
    });
    
    // Auto-detect and set platform on load
    const platformSelect = document.getElementById('feedback-platform');
    if (platformSelect) detectAndSetPlatform(platformSelect);
    // Add admin password enter key support
    const adminPassword = document.getElementById('admin-password');
    if (adminPassword) {
        adminPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                adminLogin();
            }
        });
    }
    // Load stats for default tab
    if (window.loadStats) loadStats();
});

// Tab management
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    // Find the nav-tab button for this tab and add active
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(`showTab('${tabName}')`)) {
            tab.classList.add('active');
        }
    });
    if (tabName === 'stats') loadStats();
    else if (tabName === 'recent') loadRecentFeedback();
}
window.showTab = showTab;

// --- Form & Interaction Logic ---

const QUICK_FEEDBACK_CONFIG = {
    'Super': { type: 'general', rating: 5, text: '👍 Super App! Die Funktionen sind sehr hilfreich und die Bedienung ist intuitiv. Besonders gut gefällt mir...' },
    'Bug': { type: 'bug', text: '🐛 Bug gefunden - Details:\n\nWas ist passiert: \nWann ist es aufgetreten: \nWelche Schritte haben dazu geführt: \n\nErwartetes Verhalten: ' },
    'Idee': { type: 'feature', text: '💡 Verbesserungsidee - Es wäre toll wenn...\n\nMeine Idee: \nWarum wäre das hilfreich: \nWie könnte es funktionieren: ' },
    'Verbesserung': { type: 'improvement', text: '⚡ Verbesserungsvorschlag für bestehende Funktion:\n\nBetroffene Funktion: \nAktuelles Problem: \nLösungsvorschlag: \nVorteile: ' },
    'Frage': { type: 'general', text: '❓ Frage zur Bedienung:\n\nMeine Frage: \nWas ich versucht habe: \nWo ich nicht weiterkomme: ' },
    'Feature': { type: 'feature', text: '🚀 Feature-Wunsch:\n\nGewünschte Funktion: \nAnwendungsfall: \nWarum wäre das nützlich: \nWie stelle ich mir das vor: ' },
    'Performance': { type: 'bug', text: '🐌 Performance-Problem bemerkt:\n\nWo tritt das Problem auf: \nWie äußert sich die Langsamkeit: \nGeräte-/Browser-Info: \nUhrzeit des Auftretens: ' }
};

// Quick feedback buttons
function quickFeedback(key, event) {
    const messageTextarea = document.getElementById('feedback-message');
    const typeSelect = document.getElementById('feedback-type');
    const platformSelect = document.getElementById('feedback-platform');

    const config = Object.values(QUICK_FEEDBACK_CONFIG).find(c => c.text.includes(key)) || QUICK_FEEDBACK_CONFIG[key];

    if (config) {
        messageTextarea.value = config.text;
        typeSelect.value = config.type;
        if (config.rating) {
            window.currentRating = config.rating;
        }
        updateStars();
        updateRatingText();
    } else {
        messageTextarea.value = key;
        typeSelect.value = 'general';
    }

    // Auto-detect platform without visual flash
    detectAndSetPlatform(platformSelect, { quiet: true });

    // Highlight selected quick button temporarily
    event.target.classList.add('selected');
    setTimeout(() => {
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }, 2000);

    // Focus message textarea
    messageTextarea.focus();
    // Move cursor to end for easy editing
    messageTextarea.setSelectionRange(messageTextarea.value.length, messageTextarea.value.length);
}
window.quickFeedback = quickFeedback;

function updateStars() {
    document.querySelectorAll('.star').forEach((star, index) => {
        if (index < (window.currentRating || 0)) {
            star.classList.add('active');
            star.style.color = '#ffc107';
        } else {
            star.classList.remove('active');
            star.style.color = '#ddd';
        }
    });
}
window.updateStars = updateStars;

function updateRatingText() {
    const ratingTexts = {
        1: '😞 Sehr unzufrieden',
        2: '😕 Unzufrieden',
        3: '😐 Neutral',
        4: '😊 Zufrieden',
        5: '🤩 Sehr zufrieden'
    };
    const text = (window.currentRating > 0) ? ratingTexts[window.currentRating] : 'Bewertung auswählen';
    const ratingTextEl = document.getElementById('rating-text');
    if (ratingTextEl) ratingTextEl.textContent = text;
}
window.updateRatingText = updateRatingText;

function detectAndSetPlatform(selectElement, options = { quiet: false }) {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) {
        selectElement.value = 'android';
    } else if (/mobile|iphone|ipad/.test(userAgent)) {
        selectElement.value = 'web-mobile';
    } else {
        selectElement.value = 'web';
    }
    if (!options.quiet) {
        selectElement.style.backgroundColor = '#e8f5e8';
        setTimeout(() => { selectElement.style.backgroundColor = ''; }, 1500);
    }
}
window.detectAndSetPlatform = detectAndSetPlatform;

// Recent filters toggle
function toggleRecentFilters() {
    const section = document.getElementById('recent-filters-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}
window.toggleRecentFilters = toggleRecentFilters;

// Pagination
function changePage(direction) {
    const newPage = (window.currentPage || 1) + direction;
    if (newPage >= 1 && newPage <= (window.totalPages || 1)) {
        loadRecentFeedback(newPage);
    }
}
window.changePage = changePage;

// Admin tab shortcut
function showAdminTabShortcut(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        const adminTabBtn = document.getElementById('admin-tab-btn');
        adminTabBtn.style.display = adminTabBtn.style.display === 'none' ? 'block' : 'none';
        if (adminTabBtn.style.display === 'block') {
            console.log('🔐 Admin tab activated');
        }
    }
}
document.addEventListener('keydown', showAdminTabShortcut);

// Feedback form reset
function resetForm() {
    document.getElementById('feedback-form').reset();
    window.currentRating = 0;
    updateStars();
    updateRatingText();
    document.getElementById('message-container').innerHTML = '';
}
window.resetForm = resetForm;

// --- API & Data Loading ---

async function apiFetch(url, options = {}, loadingElement, contentElement, errorContainer) {
    if (loadingElement) loadingElement.style.display = 'block';
    if (contentElement) contentElement.style.display = 'none';

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        const data = await response.json();
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';
        return data;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        if (loadingElement) loadingElement.style.display = 'none';
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3>Fehler beim Laden der Daten</h3>
                    <p>Die angeforderten Informationen konnten nicht geladen werden.</p>
                    <small>Fehler: ${error.message}</small>
                    <br><br>
                    <button onclick="${options.retryCallback || 'location.reload()'}" class="btn btn-primary">🔄 Erneut versuchen</button>
                </div>
            `;
            if (contentElement) contentElement.style.display = 'block';
        }
        throw error; // Re-throw for specific handlers
    }
}

function createStatCard(label, value) {
    return `
        <div class="stat-card">
            <h3>${label}</h3>
            <div class="stat-value">${value || 0}</div>
        </div>
    `;
}

// Load statistics
async function loadStats() {
    const statsLoading = document.getElementById('stats-loading');
    const statsContent = document.getElementById('stats-content');
    const statsGrid = document.getElementById('stats-grid');

    try {
        const data = await apiFetch('/api/feedback/stats', { retryCallback: 'loadStats()' }, statsLoading, statsContent, statsGrid);

        const statsHtml = [
            createStatCard('📊 Gesamt Feedback', data.total),
            createStatCard('📝 Heute', data.today),
            createStatCard('📅 Diese Woche', data.thisWeek),
            createStatCard('⭐ Ø Bewertung', data.averageRating || '0.0'),
            createStatCard('🐛 Bug Reports', data.bugReports),
            createStatCard('🚀 Feature Requests', data.featureRequests)
        ].join('');

        statsGrid.innerHTML = statsHtml;
        document.getElementById('stats-updated').textContent = new Date().toLocaleString('de-DE');
    } catch (e) {
        // Error is already displayed by apiFetch
    }
}
window.loadStats = loadStats;

// Load recent feedback
async function loadRecentFeedback(page = 1) {
    const recentLoading = document.getElementById('recent-loading');
    const recentContent = document.getElementById('recent-content');
    const recentPagination = document.getElementById('recent-pagination');

    if (!recentLoading || !recentContent) {
        console.error('Recent feedback containers not found');
        return;
    }
    if (recentPagination) recentPagination.style.display = 'none';

    window.currentPage = page;

    // Get filter values
    const timeFilter = document.getElementById('recent-time-filter')?.value || '24h';
    const typeFilter = document.getElementById('recent-type-filter')?.value || '';
    const platformFilter = document.getElementById('recent-platform-filter')?.value || '';
    const perPage = document.getElementById('recent-per-page')?.value || 25;

    const params = new URLSearchParams({
        page: page,
        limit: perPage,
        timeFilter: timeFilter,
        type: typeFilter,
        platform: platformFilter
    });

    const apiUrl = `/api/feedback/recent?${params}`;

    try {
        const data = await apiFetch(apiUrl, { retryCallback: 'loadRecentFeedback()' }, recentLoading, recentContent, recentContent);
        displayRecentFeedback(data);
    } catch (e) {
        // Error is already displayed by apiFetch
    }
}

function displayRecentFeedback(data) {
    const recentLoading = document.getElementById('recent-loading');
    const recentContent = document.getElementById('recent-content');
    const recentPagination = document.getElementById('recent-pagination');

    if (!data) {
        recentContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h3>Keine Daten erhalten</h3>
                <p>Die API hat keine Daten zurückgegeben.</p>
            </div>
        `;
    } else if (!data.feedbacks && !data.feedback) {
        recentContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h3>Unerwartete API-Antwort</h3>
                <p>Die API-Antwort hat ein unerwartetes Format.</p>
                <small>Verfügbare Eigenschaften: ${Object.keys(data).join(', ')}</small>
            </div>
        `;
    } else {
        // Normalisiere die Datenstruktur - API kann 'feedback' oder 'feedbacks' verwenden
        const feedbacks = data.feedbacks || data.feedback || [];
        
        if (feedbacks.length === 0) {
            recentContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                    <h3>Kein Feedback gefunden</h3>
                    <p>Für die aktuellen Filter wurde kein Feedback gefunden.</p>
                    <small>Total in response: ${data.total || 0}</small>
                </div>
            `;
        } else {
            // Update data object to use consistent property name
            data.feedbacks = feedbacks;
            const feedbackHtml = data.feedbacks.map(createRecentFeedbackItem).join('');
            recentContent.innerHTML = feedbackHtml;
        }
    }

    // Update pagination
    if (data.pagination && recentPagination) {
        window.totalPages = data.pagination.totalPages;
        document.getElementById('recent-page-info').textContent =
            `Seite ${data.pagination.page} von ${data.pagination.totalPages} (${data.pagination.total} gesamt)`;

        const prevBtn = document.getElementById('recent-prev-btn');
        const nextBtn = document.getElementById('recent-next-btn');

        if (prevBtn) prevBtn.disabled = !data.pagination.hasPrev;
        if (nextBtn) nextBtn.disabled = !data.pagination.hasNext;

        recentPagination.style.display = data.pagination.totalPages > 1 ? 'block' : 'none';
    }

    recentLoading.style.display = 'none';
    recentContent.style.display = 'block';
}

function createRecentFeedbackItem(feedback) {
    const typeIcons = { general: '💬', bug: '🐛', feature: '🚀', improvement: '⚡' };
    const platformIcons = { web: '🌐', 'web-mobile': '📱', android: '🤖' };
    const timeAgo = feedback.timestamp ? getTimeAgo(new Date(feedback.timestamp)) : 'Unbekannt';
    const stars = feedback.rating ? '⭐'.repeat(feedback.rating) : '';

    return `
        <div class="feedback-item">
            <div class="feedback-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="feedback-type ${feedback.type || 'general'}">${typeIcons[feedback.type] || '💬'} ${feedback.type || 'general'}</span>
                    <span style="color: #6c757d;">${platformIcons[feedback.platform] || '🌐'} ${feedback.platform || 'web'}</span>
                    ${stars ? `<span style="color: #ffc107;">${stars}</span>` : ''}
                    <span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                        ${feedback.status || 'neu'}
                    </span>
                </div>
                <div class="feedback-timestamp">${timeAgo}</div>
            </div>
            <div class="feedback-content">${feedback.message || 'Keine Nachricht verfügbar'}</div>
            ${feedback.name ? `<div style="font-size: 12px; color: #6c757d; margin-top: 5px;">👤 ${feedback.namePublic !== false ? feedback.name : 'Name verdeckt'}</div>` : ''}
            <div style="font-size: 12px; color: #6c757d;">ID: ${feedback.id || 'Unbekannt'} • Status: ${feedback.status || 'neu'}</div>
        </div>
    `;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'gerade eben';
    if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)} Min`;
    if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)} Std`;
    if (diffInSeconds < 2592000) return `vor ${Math.floor(diffInSeconds / 86400)} Tagen`;
    return date.toLocaleDateString('de-DE');
}

window.loadRecentFeedback = loadRecentFeedback;

// Admin login
function adminLogin() {
    const errorDiv = document.getElementById('admin-login-error');
    const passwordField = document.getElementById('admin-password');
    const password = passwordField.value;
    
    if (!password) {
        errorDiv.textContent = 'Bitte Passwort eingeben';
        errorDiv.style.display = 'block';
        return;
    }
    
    errorDiv.style.display = 'none';
    
    apiFetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        })
        .then(data => {
        if (data.token) {
            localStorage.setItem('adminToken', data.token);
        }
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        loadAdminFeedbacks();
    })
    .catch(error => {
        console.error('Admin login error:', error);
        // Customize error message for login
        if (error.message.includes('401')) {
            errorDiv.textContent = 'Ungültiges Passwort';
        } else {
            errorDiv.textContent = 'Anmeldung fehlgeschlagen';
        }
        errorDiv.style.display = 'block';
        passwordField.value = '';
    });
}

function adminLogout() {
    localStorage.removeItem('adminToken');
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('admin-password').value = '';
}

async function loadAdminFeedbacks() {
    const adminLoading = document.getElementById('admin-loading');
    const adminFeedbacksList = document.getElementById('admin-feedbacks-list');
    const adminStatsSummary = document.getElementById('admin-stats-summary');
    
    if (!adminLoading || !adminFeedbacksList) {
        console.error('Admin elements not found');
        return;
    }

    adminFeedbacksList.innerHTML = '';
    
    // Get filters
    const statusFilter = document.getElementById('admin-status-filter')?.value || '';
    const typeFilter = document.getElementById('admin-type-filter')?.value || '';
    
    const params = new URLSearchParams({
        status: statusFilter,
        type: typeFilter
    });
    
    const token = localStorage.getItem('adminToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const data = await apiFetch(`/api/admin/feedbacks?${params}`, { headers, retryCallback: 'loadAdminFeedbacks()' }, adminLoading, adminFeedbacksList, adminFeedbacksList);
        displayAdminFeedbacks(data);
    } catch (e) {
        if (e.message.includes('401') || e.message.includes('403')) {
            adminLogout(); // Token likely expired, log out
        }
    }
}

function displayAdminFeedbacks(data) {
    const adminFeedbacksList = document.getElementById('admin-feedbacks-list');
    const adminStatsSum = document.getElementById('admin-stats-summary');
    
    if (!data.feedbacks || data.feedbacks.length === 0) {
        adminFeedbacksList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <h3>Keine Feedbacks gefunden</h3>
                <p>Für die aktuellen Filter wurden keine Feedbacks gefunden.</p>
            </div>
        `;
        return;
    }
    
    // Display summary stats
    if (adminStatsSum && data.summary) {
        adminStatsSum.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #007bff;">${data.summary.total || 0}</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">Gesamt</div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${data.summary.new || 0}</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">Neu</div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ffc107;">${data.summary.inProgress || 0}</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">In Bearbeitung</div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: #17a2b8;">${data.summary.resolved || 0}</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">Gelöst</div>
                </div>
            </div>
        `;
    }
    
    // Display feedbacks
    const feedbacksHtml = data.feedbacks.map(feedback => {
        const typeIcons = {
            general: '💬',
            bug: '🐛',
            feature: '🚀',
            improvement: '⚡'
        };
        
        const platformIcons = {
            web: '🌐',
            'web-mobile': '📱',
            android: '🤖'
        };
        
        const statusColors = {
            neu: '#28a745',
            in_bearbeitung: '#ffc107',
            geloest: '#17a2b8',
            vorgemerkt: '#6c757d',
            abgelehnt: '#dc3545'
        };
        
        const timeAgo = feedback.timestamp ? getTimeAgo(new Date(feedback.timestamp)) : 'Unbekannt';
        const stars = feedback.rating ? '⭐'.repeat(feedback.rating) : '';
        
        return `
            <div class="feedback-item" style="border-left: 4px solid ${statusColors[feedback.status] || '#6c757d'};">
                <div class="feedback-header">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span class="feedback-type ${feedback.type || 'general'}">${typeIcons[feedback.type] || '💬'} ${feedback.type || 'general'}</span>
                        <span style="color: #6c757d;">${platformIcons[feedback.platform] || '🌐'} ${feedback.platform || 'web'}</span>
                        ${stars ? `<span style="color: #ffc107;">${stars}</span>` : ''}
                        <span style="background: ${statusColors[feedback.status] || '#6c757d'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                            ${feedback.status || 'neu'}
                        </span>
                    </div>
                    <div class="feedback-timestamp">${timeAgo}</div>
                </div>
                <div class="feedback-content">${feedback.message || 'Keine Nachricht verfügbar'}</div>
                ${feedback.page ? `<div style="font-size: 12px; color: #6c757d; margin-top: 5px;">📍 ${feedback.page}</div>` : ''}
                ${feedback.contact ? `<div style="font-size: 12px; color: #6c757d;">📞 ${feedback.contact}</div>` : ''}
                ${feedback.name ? `<div style="font-size: 12px; color: #6c757d;">👤 Von: ${feedback.name}</div>` : ''}
                <div style="font-size: 12px; color: #6c757d; margin-top: 10px;">
                    ID: ${feedback.id || 'Unbekannt'} • ${feedback.timestamp ? new Date(feedback.timestamp).toLocaleString('de-DE') : 'Unbekannte Zeit'}
                </div>
                <div class="feedback-actions" style="margin-top: 15px;">
                    <select onchange="updateFeedbackStatus(${feedback.id}, this.value)" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="neu" ${feedback.status === 'neu' ? 'selected' : ''}>✨ Neu</option>
                        <option value="in_bearbeitung" ${feedback.status === 'in_bearbeitung' ? 'selected' : ''}>🔄 In Bearbeitung</option>
                        <option value="geloest" ${feedback.status === 'geloest' ? 'selected' : ''}>✅ Gelöst</option>
                        <option value="vorgemerkt" ${feedback.status === 'vorgemerkt' ? 'selected' : ''}>📌 Vorgemerkt</option>
                        <option value="abgelehnt" ${feedback.status === 'abgelehnt' ? 'selected' : ''}>❌ Abgelehnt</option>
                    </select>
                    <button onclick="deleteFeedback(${feedback.id})" class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; margin-left: 10px;">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    adminFeedbacksList.innerHTML = feedbacksHtml;
}

async function updateFeedbackStatus(id, status) {
    const token = localStorage.getItem('adminToken');
    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: status })
    };

    try {
        await apiFetch(`/api/admin/feedback/${id}/status`, options);
        console.log('Status updated successfully');
        loadAdminFeedbacks();
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Fehler beim Aktualisieren des Status: ' + error.message);
    }
}

async function deleteFeedback(id) {
    if (!confirm('Möchten Sie dieses Feedback wirklich löschen?')) {
        return;
    }

    const token = localStorage.getItem('adminToken');
    const options = {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    };

    try {
        await apiFetch(`/api/admin/feedback/${id}`, options);
        console.log('Feedback deleted successfully');
        loadAdminFeedbacks();
    } catch (error) {
        console.error('Error deleting feedback:', error);
        alert('Fehler beim Löschen des Feedbacks: ' + error.message);
    }
}

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.loadAdminFeedbacks = loadAdminFeedbacks;
window.updateFeedbackStatus = updateFeedbackStatus;
window.deleteFeedback = deleteFeedback;

// ...existing code...
