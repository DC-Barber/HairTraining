

// chat/chat-cache.js - LocalStorage Cache Manager
(function() {
    'use strict';
    
    const CACHE_KEY = 'chat_messages_cache';
    const CACHE_TIMESTAMP_KEY = 'chat_cache_timestamp';
    const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours
    
    window.ChatCache = {
        // Get cached messages
        get: function() {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
                if (cached && cacheTime) {
                    const age = Date.now() - parseInt(cacheTime);
                    if (age < CACHE_VALIDITY_MS) {
                        return JSON.parse(cached);
                    }
                }
                return null;
            } catch(e) {
                console.error('Cache read error:', e);
                return null;
            }
        },
        
        // Save messages to cache
        set: function(messages) {
            try {
                const messagesToCache = messages.slice(-500);
                localStorage.setItem(CACHE_KEY, JSON.stringify(messagesToCache));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                console.log(`Cached ${messagesToCache.length} messages`);
            } catch(e) {
                console.error('Cache save error:', e);
            }
        },
        
        // Clear cache
        clear: function() {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
            console.log('Cache cleared');
        },
        
        // Get last message timestamp
        getLastTimestamp: function() {
            const messages = this.get();
            if (messages && messages.length > 0) {
                return messages[messages.length - 1].timestamp;
            }
            return '0';
        }
    };
})();