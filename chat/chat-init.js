// chat/chat-init.js

function initChatSystem() {
    injectBadge();
    observeProfileModal();
    
    // Check if user is logged in
    const checkInterval = setInterval(() => {
        const isLoggedIn = localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY);
        if (isLoggedIn) {
            injectBadge();
            injectBarberButton();
            
            // Load messages and update badge periodically
            loadChatMessages();
            
            // Update badge every 5 seconds (even when chat is closed)
            setInterval(() => {
                if (!document.getElementById('chat-page')) {
                    loadChatMessages();
                }
            }, 5000);
            
            clearInterval(checkInterval);
        }
    }, 1000);
}

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatSystem);
} else {
    initChatSystem();
}

// Make functions global
window.openChatPage = openChatPage;
window.closeChatPage = closeChatPage;
window.showFullScreenImage = showFullScreenImage;
window.viewProfile = viewProfile;
window.sendChatMessage = sendChatMessage;
window.uploadChatImage = uploadChatImage;