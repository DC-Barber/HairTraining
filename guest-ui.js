// guest-ui.js - Disable exam button for guest users with dialog message

(function() {
    // Check if guest mode is active
    function isGuestMode() {
        return localStorage.getItem('guest_mode_active') === 'true';
    }
    
    // Show dialog for guest users
    function showGuestRestrictionDialog() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'guest-dialog-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:50000;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(3px);';
        
        // Create dialog box
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;padding:25px;border-radius:20px;width:90%;max-width:320px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.3);';
        dialog.innerHTML = `
            <div style="font-size:50px;margin-bottom:10px;">🔒</div>
            <h3 style="color:#1e3a5f;margin-bottom:10px;">Exam Feature Restricted</h3>
            <p style="color:#555;margin-bottom:15px;line-height:1.5;">
                Guest users cannot access the exam.<br><br>
                Please <strong>Register</strong> and wait for <strong>Admin Approval</strong> to unlock this feature.
            </p>
            <div style="background:#f0f0f0;padding:12px;border-radius:10px;margin-bottom:20px;">
                <p style="font-size:12px;color:#666;margin:0;">
                    ℹ️ Registered users need admin approval to access full features.
                </p>
            </div>
            <button id="guest-dialog-close" style="background:#1e3a5f;color:white;border:none;padding:12px 24px;border-radius:10px;font-weight:bold;cursor:pointer;width:100%;">
                Close
            </button>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Close button handler
        document.getElementById('guest-dialog-close').onclick = () => {
            overlay.remove();
        };
        
        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
    }
    
    // Disable exam button and add custom handler for guest
    function disableExamButtonForGuest() {
        const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
        if (examBtn && isGuestMode()) {
            // Disable button visually
            examBtn.disabled = true;
            examBtn.style.opacity = '0.5';
            examBtn.style.cursor = 'not-allowed';
            examBtn.style.background = '#95a5a6';
            
            // Store original onclick
            const originalOnClick = examBtn.onclick;
            
            // Replace with dialog
            examBtn.onclick = (e) => {
                e.preventDefault();
                showGuestRestrictionDialog();
                return false;
            };
            
            // Also remove any inline onclick attribute
            examBtn.removeAttribute('onclick');
            
            console.log('🔒 Exam button disabled for guest user');
        }
    }
    
    // Check and apply when profile modal opens
    function observeProfileModal() {
        const observer = new MutationObserver(function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay && overlay.style.display === 'block') {
                setTimeout(disableExamButtonForGuest, 100);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Set guest mode flag when guest logs in
    function setGuestModeFlag() {
        // Check if user is guest by username prefix
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const data = JSON.parse(userData);
                if (data.username && data.username.toLowerCase().startsWith('guest')) {
                    localStorage.setItem('guest_mode_active', 'true');
                    console.log('🎭 Guest mode flag set');
                }
            }
        } catch(e) {}
        
        // Also check CONFIG user data
        try {
            if (typeof CONFIG !== 'undefined') {
                const userData = localStorage.getItem(CONFIG.USER_DATA_KEY);
                if (userData) {
                    const data = JSON.parse(userData);
                    if (data.username && data.username.toLowerCase().startsWith('guest')) {
                        localStorage.setItem('guest_mode_active', 'true');
                    }
                }
            }
        } catch(e) {}
    }
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setGuestModeFlag();
            if (isGuestMode()) {
                observeProfileModal();
                disableExamButtonForGuest();
            }
        });
    } else {
        setGuestModeFlag();
        if (isGuestMode()) {
            observeProfileModal();
            disableExamButtonForGuest();
        }
    }
    
    // Watch for localStorage changes (after login)
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key === 'userData' || (typeof CONFIG !== 'undefined' && key === CONFIG.USER_DATA_KEY)) {
            setTimeout(() => {
                setGuestModeFlag();
                if (isGuestMode()) {
                    disableExamButtonForGuest();
                }
            }, 200);
        }
    };
})();
