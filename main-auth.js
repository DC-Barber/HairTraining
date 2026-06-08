// main-auth.js - Simplified Version (No Login, No Upload)

// ========== PROFILE MODAL FUNCTIONS ==========

function openProfileModal() {
    const overlay = document.getElementById('profile-overlay');
    
    if (!overlay) return;
    overlay.style.display = 'block';
}

function setupProfileSystem() {
    const profileBtn = document.getElementById('profile-icon-btn');
    
    if (profileBtn) {
        const newProfileBtn = profileBtn.cloneNode(true);
        profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
        
        newProfileBtn.onclick = function() {
            openProfileModal();
        };
    }

    const closeBtn = document.getElementById('close-profile');
    if (closeBtn) {
        closeBtn.onclick = function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'none';
        };
    }
}

// Update profile text
function updateProfileTextAndIcon() {
    const profileTextEl = document.getElementById('profile-text');
    
    if (!profileTextEl) return;
    
    profileTextEl.innerHTML = 'Main_MENU';
    profileTextEl.style.background = '#1e3a5f';
    profileTextEl.style.color = 'white';
}

// Global functions
window.openExam = () => {
    window.location.href = 'exam/exam.html';
};

// Initialize
(function init() {
    setupProfileSystem();
    updateProfileTextAndIcon();
})();