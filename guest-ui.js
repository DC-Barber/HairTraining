// guest-ui.js - Hide exam button for guest users only

(function() {
    // Check if guest mode is active
    function isGuestMode() {
        return localStorage.getItem('guest_mode_active') === 'true';
    }
    
    // Hide exam button in profile modal
    function hideExamButton() {
        const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
        if (examBtn && isGuestMode()) {
            examBtn.style.display = 'none';
            console.log('🔒 Exam button hidden for guest user');
        }
    }
    
    // Also hide when profile modal opens (dynamic check)
    function observeProfileModal() {
        const observer = new MutationObserver(function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay && overlay.style.display === 'block') {
                setTimeout(hideExamButton, 100);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Run when DOM is ready and also when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isGuestMode()) {
                observeProfileModal();
                hideExamButton();
            }
        });
    } else {
        if (isGuestMode()) {
            observeProfileModal();
            hideExamButton();
        }
    }
})();

