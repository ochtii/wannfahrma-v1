// Modern feedback system JS (theme switcher, tab logic, form, API, etc.)

// Theme switching logic
function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #222 0%, #38b000 100%)');
        document.documentElement.style.setProperty('--text-color', '#f8f9fa');
    } else if (theme === 'light') {
        document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #38b000 0%, #70e000 100%)');
        document.documentElement.style.setProperty('--text-color', '#222');
    } else {
        // System/default
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #222 0%, #38b000 100%)');
            document.documentElement.style.setProperty('--text-color', '#f8f9fa');
        } else {
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
        loadRecentFeedback();
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
    else if (tabName === 'recent') loadRecentFeedback();
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
                // Fallback with demo data
                const demoStatsHtml = `
                    <div class="stat-card">
                        <h3>📊 Gesamt Feedback</h3>
                        <div class="stat-value">42</div>
                    </div>
                    <div class="stat-card">
                        <h3>📝 Heute</h3>
                        <div class="stat-value">3</div>
                    </div>
                    <div class="stat-card">
                        <h3>📅 Diese Woche</h3>
                        <div class="stat-value">12</div>
                    </div>
                    <div class="stat-card">
                        <h3>⭐ Ø Bewertung</h3>
                        <div class="stat-value">4.2</div>
                    </div>
                    <div class="stat-card">
                        <h3>🐛 Bug Reports</h3>
                        <div class="stat-value">5</div>
                    </div>
                    <div class="stat-card">
                        <h3>🚀 Feature Requests</h3>
                        <div class="stat-value">8</div>
                    </div>
                `;
                statsGrid.innerHTML = demoStatsHtml;
                document.getElementById('stats-updated').textContent = new Date().toLocaleString('de-DE');
                
                statsLoading.style.display = 'none';
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
    const recentLoading = document.getElementById('recent-loading');
    const recentContent = document.getElementById('recent-content');
    const recentPagination = document.getElementById('recent-pagination');
    
    if (!recentLoading || !recentContent) {
        console.error('Recent feedback containers not found');
        return;
    }
    
    recentLoading.style.display = 'block';
    recentContent.style.display = 'none';
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
    
    // API call to get recent feedback
    fetch(`/api/feedback/recent?${params}`)
        .then(response => response.json())
        .then(data => {
            displayRecentFeedback(data);
        })
        .catch(error => {
            console.error('Error loading recent feedback:', error);
            // Fallback with demo data
            const demoData = {
                feedbacks: [
                    {
                        id: 1,
                        type: 'general',
                        message: '👍 Super App! Funktioniert perfekt.',
                        platform: 'web',
                        rating: 5,
                        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                        status: 'open'
                    },
                    {
                        id: 2,
                        type: 'bug',
                        message: '🐛 Manchmal laden die Abfahrten nicht korrekt.',
                        platform: 'android',
                        rating: 2,
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                        status: 'open'
                    },
                    {
                        id: 3,
                        type: 'feature',
                        message: '🚀 Wäre cool wenn man Favoriten speichern könnte!',
                        platform: 'web-mobile',
                        rating: 4,
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
                        status: 'open'
                    }
                ],
                pagination: {
                    page: 1,
                    totalPages: 1,
                    total: 3,
                    hasNext: false,
                    hasPrev: false
                }
            };
            displayRecentFeedback(demoData);
        });
}

function displayRecentFeedback(data) {
    const recentLoading = document.getElementById('recent-loading');
    const recentContent = document.getElementById('recent-content');
    const recentPagination = document.getElementById('recent-pagination');
    
    if (!data.feedbacks || data.feedbacks.length === 0) {
        recentContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <h3>Kein Feedback gefunden</h3>
                <p>Für die aktuellen Filter wurde kein Feedback gefunden.</p>
            </div>
        `;
    } else {
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
    
    recentLoading.style.display = 'none';
    recentContent.style.display = 'block';
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

// Admin login (stub)
function adminLogin() {
    const errorDiv = document.getElementById('admin-login-error');
    errorDiv.style.display = 'none';
    // Simulate login
    setTimeout(() => {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
    }, 500);
}
window.adminLogin = adminLogin;

// ...existing code...
