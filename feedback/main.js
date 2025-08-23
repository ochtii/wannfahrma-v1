// Modern feedback system JS (theme switcher, tab logic, form, API, etc.)

// Theme switching logic
function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)');
        document.documentElement.style.setProperty('--text-color', '#f0f0f0');
    } else if (theme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #38b000 0%, #70e000 100%)');
        document.documentElement.style.setProperty('--text-color', '#222');
    } else {
        // System/default
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)');
            document.documentElement.style.setProperty('--text-color', '#f0f0f0');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #38b000 0%, #70e000 100%)');
            document.documentElement.style.setProperty('--text-color', '#222');
        }
    }
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
    // Auto-detect and set platform on load
    const platformSelect = document.getElementById('feedback-platform');
    if (platformSelect) detectAndSetPlatform(platformSelect);
    // Add admin password enter key support
    const adminPassword = document.getElementById('admin-password');
    if (adminPassword) {
        adminPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                adminLogin();
            }
        });
    }
    // Load stats for default tab
    if (window.loadStats) loadStats();
    // Initialize recent feedback if on that tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'recent-tab') {
        console.log('Recent tab is active on load, loading recent feedback');
        loadRecentFeedback();
    } else {
        console.log('Active tab on load:', activeTab ? activeTab.id : 'none');
    }
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
    else if (tabName === 'recent') {
        console.log('Loading recent feedback for tab switch');
        loadRecentFeedback();
    }
}
window.showTab = showTab;

// Quick feedback buttons
function quickFeedback(message) {
    document.getElementById('feedback-message').value = message;
    // Auto-select type based on message
    const select = document.getElementById('feedback-type');
    const platformSelect = document.getElementById('feedback-platform');
    if (message.includes('Bug') || message.includes('🐛')) {
        select.value = 'bug';
    } else if (message.includes('Idee') || message.includes('💡')) {
        select.value = 'feature';
    } else if (message.includes('Super') || message.includes('👍')) {
        select.value = 'general';
        window.currentRating = 5;
        updateStars();
        updateRatingText();
    }
    // Auto-detect platform
    detectAndSetPlatform(platformSelect);
    // Highlight selected quick button temporarily
    event.target.classList.add('selected');
    setTimeout(() => {
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }, 2000);
    // Focus message textarea
    document.getElementById('feedback-message').focus();
}
window.quickFeedback = quickFeedback;

function updateStars() {
    document.querySelectorAll('.star').forEach((star, index) => {
        star.classList.toggle('active', index < (window.currentRating || 0));
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

function detectAndSetPlatform(selectElement) {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
    if (/android/.test(userAgent)) {
        selectElement.value = 'android';
    } else if (isMobile) {
        selectElement.value = 'web-mobile';
    } else {
        selectElement.value = 'web';
    }
    selectElement.style.backgroundColor = '#e8f5e8';
    setTimeout(() => {
        selectElement.style.backgroundColor = '';
    }, 1500);
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

// Load statistics
function loadStats() {
    const statsLoading = document.getElementById('stats-loading');
    const statsContent = document.getElementById('stats-content');
    const statsGrid = document.getElementById('stats-grid');
    
    try {
        statsLoading.style.display = 'block';
        statsContent.style.display = 'none';
        
        // API call to get stats
        fetch('/api/feedback/stats')
            .then(response => response.json())
            .then(data => {
                // Generate stats cards
                const statsHtml = `
                    <div class="stat-card">
                        <h3>📊 Gesamt Feedback</h3>
                        <div class="stat-value">${data.total || 0}</div>
                    </div>
                    <div class="stat-card">
                        <h3>📝 Heute</h3>
                        <div class="stat-value">${data.today || 0}</div>
                    </div>
                    <div class="stat-card">
                        <h3>📅 Diese Woche</h3>
                        <div class="stat-value">${data.thisWeek || 0}</div>
                    </div>
                    <div class="stat-card">
                        <h3>⭐ Ø Bewertung</h3>
                        <div class="stat-value">${data.averageRating || '0.0'}</div>
                    </div>
                    <div class="stat-card">
                        <h3>🐛 Bug Reports</h3>
                        <div class="stat-value">${data.bugReports || 0}</div>
                    </div>
                    <div class="stat-card">
                        <h3>🚀 Feature Requests</h3>
                        <div class="stat-value">${data.featureRequests || 0}</div>
                    </div>
                `;
                statsGrid.innerHTML = statsHtml;
                document.getElementById('stats-updated').textContent = new Date().toLocaleString('de-DE');
                
                statsLoading.style.display = 'none';
                statsContent.style.display = 'block';
            })
            .catch(error => {
                console.error('Error loading stats:', error);
                statsLoading.style.display = 'none';
                statsGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #dc3545;">
                        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                        <h3>Fehler beim Laden der Statistiken</h3>
                        <p>Die Statistiken konnten nicht geladen werden.</p>
                        <small>Fehler: ${error.message}</small>
                        <br><br>
                        <button onclick="loadStats()" class="btn btn-primary">� Erneut versuchen</button>
                    </div>
                `;
                statsContent.style.display = 'block';
            });
    } catch (error) {
        console.error('Error in loadStats:', error);
        statsLoading.innerHTML = `<div style='color: #dc3545;'>❌ Fehler beim Laden der Statistiken<br><small>${error.message}</small></div>`;
    }
}
window.loadStats = loadStats;

// Load recent feedback
function loadRecentFeedback(page = 1) {
    console.log('loadRecentFeedback called with page:', page);
    
    const recentLoading = document.getElementById('recent-loading');
    const recentContent = document.getElementById('recent-content');
    const recentPagination = document.getElementById('recent-pagination');
    
    console.log('Elements found:', {
        recentLoading: !!recentLoading,
        recentContent: !!recentContent,
        recentPagination: !!recentPagination
    });
    
    if (!recentLoading || !recentContent) {
        console.error('Recent feedback containers not found');
        return;
    }
    
    console.log('Setting loading state...');
    recentLoading.style.display = 'block';
    recentContent.style.display = 'none';
    if (recentPagination) recentPagination.style.display = 'none';
    
    window.currentPage = page;
    
    // Get filter values
    const timeFilter = document.getElementById('recent-time-filter')?.value || '24h';
    const typeFilter = document.getElementById('recent-type-filter')?.value || '';
    const platformFilter = document.getElementById('recent-platform-filter')?.value || '';
    const perPage = document.getElementById('recent-per-page')?.value || 25;
    
    console.log('Filters:', { timeFilter, typeFilter, platformFilter, perPage });
    
    const params = new URLSearchParams({
        page: page,
        limit: perPage,
        timeFilter: timeFilter,
        type: typeFilter,
        platform: platformFilter
    });
    
    const apiUrl = `/api/feedback/recent?${params}`;
    console.log('Making API call to:', apiUrl);
    
    // API call to get recent feedback
    fetch(apiUrl)
        .then(response => {
            console.log('API Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API Response data:', data);
            displayRecentFeedback(data);
        })
        .catch(error => {
            console.error('Error loading recent feedback:', error);
            recentLoading.style.display = 'none';
            recentContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3>Fehler beim Laden des Feedbacks</h3>
                    <p>Das aktuelle Feedback konnte nicht geladen werden.</p>
                    <small>Fehler: ${error.message}</small>
                    <br><br>
                    <button onclick="loadRecentFeedback()" class="btn btn-primary">🔄 Erneut versuchen</button>
                </div>
            `;
            recentContent.style.display = 'block';
        });
}

function displayRecentFeedback(data) {
    console.log('displayRecentFeedback called with data:', data);
    
    const recentLoading = document.getElementById('recent-loading');
    const recentContent = document.getElementById('recent-content');
    const recentPagination = document.getElementById('recent-pagination');
    
    console.log('Display elements found:', {
        recentLoading: !!recentLoading,
        recentContent: !!recentContent,
        recentPagination: !!recentPagination
    });
    
    if (!data.feedbacks || data.feedbacks.length === 0) {
        console.log('No feedbacks found, showing empty state');
        recentContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <h3>Kein Feedback gefunden</h3>
                <p>Für die aktuellen Filter wurde kein Feedback gefunden.</p>
            </div>
        `;
    } else {
        console.log(`Displaying ${data.feedbacks.length} feedbacks`);
        const feedbackHtml = data.feedbacks.map(feedback => {
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
            
            const timeAgo = getTimeAgo(new Date(feedback.timestamp));
            const stars = feedback.rating ? '⭐'.repeat(feedback.rating) : '';
            
            return `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="feedback-type ${feedback.type}">${typeIcons[feedback.type] || '💬'} ${feedback.type}</span>
                            <span style="color: #6c757d;">${platformIcons[feedback.platform] || '🌐'} ${feedback.platform}</span>
                            ${stars ? `<span style="color: #ffc107;">${stars}</span>` : ''}
                        </div>
                        <div class="feedback-timestamp">${timeAgo}</div>
                    </div>
                    <div class="feedback-content">${feedback.message}</div>
                    <div style="font-size: 12px; color: #6c757d;">
                        ID: ${feedback.id} • Status: ${feedback.status || 'open'}
                    </div>
                </div>
            `;
        }).join('');
        
        recentContent.innerHTML = feedbackHtml;
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
    
    console.log('Setting content visibility...');
    recentLoading.style.display = 'none';
    recentContent.style.display = 'block';
    console.log('Display completed');
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

// Debug function to test recent feedback loading
window.testRecentFeedback = function() {
    console.log('Manual test of loadRecentFeedback');
    loadRecentFeedback();
};

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
    
    // API call to authenticate
    fetch('/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ungültiges Passwort');
        }
        return response.json();
    })
    .then(data => {
        // Store auth token if provided
        if (data.token) {
            localStorage.setItem('adminToken', data.token);
        }
        
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        
        // Load admin data
        loadAdminFeedbacks();
    })
    .catch(error => {
        console.error('Admin login error:', error);
        errorDiv.textContent = error.message || 'Anmeldung fehlgeschlagen';
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

function loadAdminFeedbacks() {
    const adminLoading = document.getElementById('admin-loading');
    const adminFeedbacksList = document.getElementById('admin-feedbacks-list');
    const adminStatsSummary = document.getElementById('admin-stats-summary');
    
    if (!adminLoading || !adminFeedbacksList) {
        console.error('Admin elements not found');
        return;
    }
    
    adminLoading.style.display = 'block';
    if (adminFeedbacksList) adminFeedbacksList.innerHTML = '';
    
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
    
    // Load admin feedbacks
    fetch(`/api/admin/feedbacks?${params}`, { headers })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            displayAdminFeedbacks(data);
            adminLoading.style.display = 'none';
        })
        .catch(error => {
            console.error('Error loading admin feedbacks:', error);
            adminLoading.style.display = 'none';
            adminFeedbacksList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3>Fehler beim Laden der Admin-Daten</h3>
                    <p>Die Feedback-Daten konnten nicht geladen werden.</p>
                    <small>Fehler: ${error.message}</small>
                    <br><br>
                    <button onclick="loadAdminFeedbacks()" class="btn btn-primary">🔄 Erneut versuchen</button>
                </div>
            `;
        });
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
        
        const timeAgo = getTimeAgo(new Date(feedback.timestamp));
        const stars = feedback.rating ? '⭐'.repeat(feedback.rating) : '';
        
        return `
            <div class="feedback-item" style="border-left: 4px solid ${statusColors[feedback.status] || '#6c757d'};">
                <div class="feedback-header">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span class="feedback-type ${feedback.type}">${typeIcons[feedback.type] || '💬'} ${feedback.type}</span>
                        <span style="color: #6c757d;">${platformIcons[feedback.platform] || '🌐'} ${feedback.platform}</span>
                        ${stars ? `<span style="color: #ffc107;">${stars}</span>` : ''}
                        <span style="background: ${statusColors[feedback.status] || '#6c757d'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                            ${feedback.status || 'neu'}
                        </span>
                    </div>
                    <div class="feedback-timestamp">${timeAgo}</div>
                </div>
                <div class="feedback-content">${feedback.message}</div>
                ${feedback.page ? `<div style="font-size: 12px; color: #6c757d; margin-top: 5px;">📍 ${feedback.page}</div>` : ''}
                ${feedback.contact ? `<div style="font-size: 12px; color: #6c757d;">📞 ${feedback.contact}</div>` : ''}
                <div style="font-size: 12px; color: #6c757d; margin-top: 10px;">
                    ID: ${feedback.id} • ${feedback.timestamp ? new Date(feedback.timestamp).toLocaleString('de-DE') : ''}
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

function updateFeedbackStatus(id, status) {
    const token = localStorage.getItem('adminToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    fetch(`/api/admin/feedback/${id}/status`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ status: status })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Status konnte nicht aktualisiert werden');
        }
        return response.json();
    })
    .then(data => {
        console.log('Status updated successfully');
        // Reload the list to reflect changes
        loadAdminFeedbacks();
    })
    .catch(error => {
        console.error('Error updating status:', error);
        alert('Fehler beim Aktualisieren des Status: ' + error.message);
    });
}

function deleteFeedback(id) {
    if (!confirm('Möchten Sie dieses Feedback wirklich löschen?')) {
        return;
    }
    
    const token = localStorage.getItem('adminToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Feedback konnte nicht gelöscht werden');
        }
        return response.json();
    })
    .then(data => {
        console.log('Feedback deleted successfully');
        // Reload the list to reflect changes
        loadAdminFeedbacks();
    })
    .catch(error => {
        console.error('Error deleting feedback:', error);
        alert('Fehler beim Löschen des Feedbacks: ' + error.message);
    });
}

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.loadAdminFeedbacks = loadAdminFeedbacks;
window.updateFeedbackStatus = updateFeedbackStatus;
window.deleteFeedback = deleteFeedback;

// ...existing code...
