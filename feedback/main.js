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
window.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        setTheme(savedTheme);
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (themeSelect.value === 'system') {
                setTheme('system');
            }
        });
    }
    // ...existing code for tab logic, form, API, etc. (migrate from index.html)...
});

// Tab management
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
    if (tabName === 'stats') loadStats();
    else if (tabName === 'recent') loadRecentFeedback();
}
// ...existing code for feedback form, quick buttons, API, admin, etc. (migrate from index.html)...
