// chat/chat-cache.js - Performance Optimized
(function() {
    'use strict';
    
    const CACHE_KEY = 'chat_messages_cache';
    const CACHE_TIMESTAMP_KEY = 'chat_cache_timestamp';
    const MSG_IDS_KEY = 'chat_message_ids';
    
    window.ChatCache = {
        get: function() {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    return JSON.parse(cached);
                }
                return null;
            } catch(e) {
                return null;
            }
        },
        
        set: function(messages) {
            try {
                // Keep only last 200 messages for performance
                const messagesToCache = messages.slice(-200);
                localStorage.setItem(CACHE_KEY, JSON.stringify(messagesToCache));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                
                // Store message IDs for quick lookup
                const ids = messagesToCache.map(m => m.id);
                localStorage.setItem(MSG_IDS_KEY, JSON.stringify(ids));
            } catch(e) {}
        },
        
        clear: function() {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
            localStorage.removeItem(MSG_IDS_KEY);
        },
        
        hasMessage: function(id) {
            try {
                const ids = JSON.parse(localStorage.getItem(MSG_IDS_KEY) || '[]');
                return ids.includes(id);
            } catch(e) {
                return false;
            }
        },
        
        getLastTimestamp: function() {
            const messages = this.get();
            if (messages && messages.length > 0) {
                return messages[messages.length - 1].timestamp;
            }
            return '0';
        },
        
        // Get cached messages immediately (synchronous)
        getSync: function() {
            const cached = this.get();
            return cached || [];
        }
    };
})();