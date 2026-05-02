// chat/chat-loader.js - Optimized Background Sync
(function() {
    'use strict';
    
    let syncInterval = null;
    let lastTimestamp = '0';
    let isSyncing = false;
    let messageContainer = null;
    let isChatOpen = false;
    let initialLoadDone = false;
    
    // Update unread badge
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
                        padding: 0 4px;
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
        } catch(e) {}
    }
    
    // Sync new messages
    async function syncMessages(forceRefresh = false) {
        if (isSyncing) return;
        isSyncing = true;
        
        try {
            const newMessages = await window.ChatAPI.getNewMessages(lastTimestamp);
            
            if (newMessages && newMessages.length > 0) {
                // Update last timestamp
                const newestMsg = newMessages[newMessages.length - 1];
                if (newestMsg && newestMsg.timestamp > lastTimestamp) {
                    lastTimestamp = newestMsg.timestamp;
                }
                
                // Update cache by merging
                const cached = window.ChatCache.get();
                let allMessages = cached ? [...cached] : [];
                
                // Add only new messages (avoid duplicates)
                for (const msg of newMessages) {
                    if (!window.ChatCache.hasMessage(msg.id)) {
                        allMessages.push(msg);
                    }
                }
                
                // Sort by timestamp
                allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                window.ChatCache.set(allMessages);
                
                // Update UI if chat is open
                if (isChatOpen && messageContainer) {
                    window.ChatUI.appendNewMessages(newMessages, messageContainer);
                }
                
                updateBadge();
            }
        } catch(e) {
            console.error('Sync error:', e);
        } finally {
            isSyncing = false;
        }
    }
    
    // Load initial data (fast - from cache first)
    async function loadInitialData() {
        if (initialLoadDone) return;
        
        const user = window.ChatAPI?.getCurrentUser();
        if (!user) return;
        
        // IMMEDIATE: Show cached messages (0ms delay)
        const cached = window.ChatCache.getSync();
        if (cached.length > 0) {
            lastTimestamp = window.ChatCache.getLastTimestamp();
        }
        
        // If chat is open, display immediately
        if (isChatOpen && messageContainer) {
            if (cached.length > 0) {
                window.ChatUI.loadAllMessages(cached, messageContainer);
            } else {
                window.ChatUI.showLoading(messageContainer, 'Loading...');
            }
        }
        
        // Then fetch latest from server (fast)
        try {
            const newMessages = await window.ChatAPI.getNewMessages(lastTimestamp);
            if (newMessages && newMessages.length > 0) {
                const newestMsg = newMessages[newMessages.length - 1];
                if (newestMsg && newestMsg.timestamp > lastTimestamp) {
                    lastTimestamp = newestMsg.timestamp;
                }
                
                // Merge and cache
                const cached = window.ChatCache.getSync();
                let allMessages = [...cached];
                for (const msg of newMessages) {
                    if (!window.ChatCache.hasMessage(msg.id)) {
                        allMessages.push(msg);
                    }
                }
                allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                window.ChatCache.set(allMessages);
                
                // Update UI if chat is open
                if (isChatOpen && messageContainer) {
                    window.ChatUI.appendNewMessages(newMessages, messageContainer);
                } else if (newMessages.length > 0) {
                    updateBadge();
                }
            }
        } catch(e) {
            console.error('Initial fetch error:', e);
        }
        
        initialLoadDone = true;
    }
    
    // Start background sync
    async function startBackgroundSync() {
        const user = window.ChatAPI?.getCurrentUser();
        if (!user) return;
        
        // Load initial data
        await loadInitialData();
        
        // Auto sync every 3 seconds (faster)
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(syncMessages, 3000);
        
        console.log('Background sync started (3s interval)');
    }
    
    // Register chat events
    window.ChatEvents = {
        onChatOpen: function(container) {
            isChatOpen = true;
            messageContainer = container;
            
            // Display cached messages immediately
            const cached = window.ChatCache.getSync();
            if (cached.length > 0) {
                window.ChatUI.loadAllMessages(cached, container);
            } else {
                window.ChatUI.showLoading(container, 'Loading messages...');
            }
            
            // Then sync latest
            syncMessages(true).then(async () => {
                const updated = window.ChatCache.getSync();
                if (updated.length > 0) {
                    window.ChatUI.loadAllMessages(updated, container);
                } else {
                    window.ChatUI.showEmpty(container);
                }
                updateBadge();
            });
        },
        
        onChatClose: function() {
            isChatOpen = false;
            messageContainer = null;
            updateBadge();
        }
    };
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startBackgroundSync);
    } else {
        startBackgroundSync();
    }
    
    // Update badge every 5 seconds
    setInterval(updateBadge, 5000);
    
    console.log('Optimized chat loader started');
})();