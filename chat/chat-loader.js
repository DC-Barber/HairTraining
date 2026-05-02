

// chat/chat-loader.js - Background Sync & Unread Badge
(function() {
    'use strict';
    
    let syncInterval = null;
    let lastTimestamp = '0';
    let isSyncing = false;
    let messageContainer = null;
    let isChatOpen = false;
    
    // Update unread badge on profile icon
    async function updateBadge() {
        const user = window.ChatAPI?.getCurrentUser();
        if (!user) return;
        
        try {
            const count = await window.ChatAPI.getUnreadCount();
            const profileIcon = document.getElementById('profile-icon-btn');
            
            if (profileIcon && count > 0) {
                let badge = document.getElementById('unread-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.id = 'unread-badge';
                    badge.style.cssText = `
                        position: absolute; top: -5px; right: -5px;
                        background: #dc3545; color: white; border-radius: 50%;
                        min-width: 18px; height: 18px; font-size: 10px;
                        display: flex; align-items: center; justify-content: center;
                        padding: 0 4px; font-weight: bold;
                    `;
                    profileIcon.style.position = 'relative';
                    profileIcon.appendChild(badge);
                }
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                const badge = document.getElementById('unread-badge');
                if (badge) badge.style.display = 'none';
            }
        } catch(e) {
            console.error('Badge update error:', e);
        }
    }
    
    // Sync new messages from server
    async function syncMessages() {
        if (isSyncing) return;
        isSyncing = true;
        
        try {
            const newMessages = await window.ChatAPI.getNewMessages(lastTimestamp);
            
            if (newMessages && newMessages.length > 0) {
                console.log(`Synced ${newMessages.length} new messages`);
                
                // Update last timestamp
                const newestMsg = newMessages[newMessages.length - 1];
                if (newestMsg && newestMsg.timestamp > lastTimestamp) {
                    lastTimestamp = newestMsg.timestamp;
                }
                
                // Update cache
                const cached = window.ChatCache.get();
                const allMessages = [...(cached || []), ...newMessages];
                window.ChatCache.set(allMessages);
                
                // If chat is open, append to UI without clearing
                if (isChatOpen && messageContainer) {
                    window.ChatUI.appendNewMessages(newMessages, messageContainer);
                }
                
                // Update badge
                await updateBadge();
            }
        } catch(e) {
            console.error('Sync error:', e);
        } finally {
            isSyncing = false;
        }
    }
    
    // Initialize background sync
    async function initBackgroundSync() {
        const user = window.ChatAPI?.getCurrentUser();
        if (!user) return;
        
        // Load from cache first
        const cached = window.ChatCache.get();
        if (cached && cached.length > 0) {
            lastTimestamp = window.ChatCache.getLastTimestamp();
            console.log(`Loaded ${cached.length} messages from cache`);
        }
        
        // Initial sync from server
        await syncMessages();
        
        // Start periodic sync every 5 seconds
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(syncMessages, 5000);
        
        console.log('Background sync started');
    }
    
    // Register chat open/close
    window.ChatEvents = {
        onChatOpen: function(container) {
            isChatOpen = true;
            messageContainer = container;
            
            // Load from cache immediately
            const cached = window.ChatCache.get();
            if (cached && cached.length > 0) {
                window.ChatUI.loadAllMessages(cached, container);
                
                // Update last timestamp
                const newestMsg = cached[cached.length - 1];
                if (newestMsg && newestMsg.timestamp > lastTimestamp) {
                    lastTimestamp = newestMsg.timestamp;
                }
            } else {
                window.ChatUI.showLoading(container);
            }
            
            // Then sync latest
            syncMessages().then(() => {
                // Refresh UI with latest after sync
                const latestCache = window.ChatCache.get();
                if (latestCache && latestCache.length > 0) {
                    window.ChatUI.loadAllMessages(latestCache, container);
                } else {
                    window.ChatUI.showEmpty(container);
                }
            });
        },
        
        onChatClose: function() {
            isChatOpen = false;
            messageContainer = null;
            updateBadge(); // Refresh badge when chat closes
        }
    };
    
    // Start background sync when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackgroundSync);
    } else {
        initBackgroundSync();
    }
    
    // Also update badge periodically
    setInterval(updateBadge, 10000);
    
    console.log('Chat loader (background sync) loaded');
})();