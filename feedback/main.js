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

// ...add all feedback, stats, recent, admin, and API logic here as in original index.html...
