// api-service.js - Full Upgrade Version
// Works on: GitHub Pages, Localhost, Android Code Editor, Any Browser

const APIService = {
    // ========== UTILITY FUNCTIONS ==========
    
    async getIP() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            return data.ip;
        } catch (e) { 
            return "Unknown"; 
        }
    },

    async getDeviceId() {
        try {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            return result.visitorId;
        } catch (e) {
            return this.getEnhancedFallbackId();
        }
    },

    getEnhancedFallbackId() {
        const components = [
            navigator.userAgent,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            screen.pixelDepth,
            new Date().getTimezoneOffset(),
            navigator.language,
            navigator.platform,
            navigator.hardwareConcurrency || 1,
            navigator.deviceMemory || 'unknown',
            !!navigator.maxTouchPoints
        ];
        
        let hash = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 24);
    },

    // ========== AUTH FUNCTIONS ==========
    
    async recordHistory(username, deviceId) {
        const ip = await this.getIP();
        const payload = {
            action: 'addHistory',
            username: username,
            deviceId: deviceId,
            ipAddress: ip,
            browserInfo: navigator.userAgent
        };
        return fetch(CONFIG.HISTORY_SHEET_API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
    },

    async submitAuth(payload) {
        const res = await fetch(CONFIG.USERS_SHEET_API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    },

    // ========== PROFILE PICTURE UPLOAD ==========
    
    async uploadProfilePicture(file, username, fullname) {
        try {
            // Convert file to base64
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
            });
            
            const deviceId = localStorage.getItem('device_id') || await this.getDeviceId();
            
            // Step 1: Upload to ImgBB directly (no CORS issue with ImgBB)
            const formData = new FormData();
            formData.append('image', base64);
            formData.append('key', CONFIG.IMGBB_API_KEY);
            
            console.log('📤 Uploading to ImgBB...');
            const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });
            
            const imgbbResult = await imgbbResponse.json();
            
            if (!imgbbResult.success) {
                return { success: false, error: imgbbResult.error?.message || 'ImgBB upload failed' };
            }
            
            const imageUrl = imgbbResult.data.url;
            console.log('✅ ImgBB upload success:', imageUrl);
            
            // Step 2: Store URL to Google Sheet via Apps Script (with CORS handling)
            const storeResult = await this.storeProfileUrlToSheet(imageUrl, username, fullname, deviceId);
            
            if (storeResult.success) {
                // Update all local storage locations
                this.updateLocalProfileStorage(username, imageUrl);
                return { success: true, imageUrl: imageUrl };
            } else {
                return { success: false, error: storeResult.error };
            }
            
        } catch (error) {
            console.error('❌ Upload error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Store URL to Google Sheet (with CORS proxy fallback)
    async storeProfileUrlToSheet(imageUrl, username, fullname, deviceId) {
        const payload = {
            action: 'upload',
            imageBase64: null,
            imageUrl: imageUrl,  // Direct URL instead of base64
            username: username,
            fullname: fullname || '',
            deviceId: deviceId
        };
        
        // Try multiple methods
        const methods = [
            () => this.fetchWithCorsProxy(payload),
            () => this.fetchDirectNoCors(payload),
            () => this.fetchWithGoogleCors(payload)
        ];
        
        for (const method of methods) {
            try {
                const result = await method();
                if (result && result.success) {
                    return result;
                }
            } catch (e) {
                console.warn('Method failed, trying next:', e.message);
            }
        }
        
        return { success: false, error: 'All storage methods failed' };
    },
    
    async fetchWithCorsProxy(payload) {
        const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
        const response = await fetch(CORS_PROXY + CONFIG.IMGBB_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    },
    
    async fetchDirectNoCors(payload) {
        const response = await fetch(CONFIG.IMGBB_PROXY_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // no-cors mode returns opaque response, assume success
        return { success: true };
    },
    
    async fetchWithGoogleCors(payload) {
        const response = await fetch(CONFIG.IMGBB_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    },
    
    // Update all local storage locations
    updateLocalProfileStorage(username, imageUrl) {
        // Update main user data
        const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
        userData.profilePic = imageUrl;
        localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
        
        // Update cache
        localStorage.setItem(`profile_cache_${username}`, imageUrl);
        localStorage.setItem(`profile_cache_${username}_time`, Date.now().toString());
        
        // Update permanent storage
        localStorage.setItem(`user_profile_${username}`, imageUrl);
        
        console.log('💾 Local storage updated for:', username);
    },

    // ========== PROFILE PICTURE GET ==========
    
    async getProfilePicture(username, forceRefresh = false) {
        if (!username) {
            console.warn('No username provided');
            return { success: false, imageUrl: null };
        }
        
        // Check local storage first (for speed)
        const permanentUrl = localStorage.getItem(`user_profile_${username}`);
        const cacheKey = `profile_cache_${username}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        
        // If not force refresh and have valid cache, use it
        if (!forceRefresh && cached && cacheTime && cached !== 'null') {
            const age = Date.now() - parseInt(cacheTime);
            if (age < 5 * 60 * 1000) { // 5 minutes cache
                console.log('📦 Using cached profile picture for:', username);
                return { success: true, imageUrl: cached, fromCache: true };
            }
        }
        
        // If have permanent URL but cache expired, show it while fetching fresh
        if (permanentUrl && permanentUrl !== 'null' && !forceRefresh) {
            console.log('📦 Using permanent storage, fetching fresh in background');
            // Fetch in background
            this.fetchProfileFromServer(username).then(result => {
                if (result.success && result.imageUrl !== permanentUrl) {
                    console.log('🔄 Profile picture updated from background sync');
                }
            }).catch(err => console.error('Background sync failed:', err));
            return { success: true, imageUrl: permanentUrl, fromPermanent: true };
        }
        
        // Fetch from server
        return await this.fetchProfileFromServer(username);
    },
    
    async fetchProfileFromServer(username) {
        console.log('🔍 Fetching profile from server for:', username);
        
        const payload = {
            action: 'getProfilePic',
            username: username
        };
        
        // Try multiple methods
        const methods = [
            () => this.fetchWithCorsProxy(payload),
            () => this.fetchWithGoogleCors(payload)
        ];
        
        for (const method of methods) {
            try {
                const result = await method();
                console.log('📸 Server response:', result);
                
                if (result && result.success && result.imageUrl && result.imageUrl !== 'null') {
                    this.updateLocalProfileStorage(username, result.imageUrl);
                    return { success: true, imageUrl: result.imageUrl };
                }
            } catch (e) {
                console.warn('Fetch method failed:', e.message);
            }
        }
        
        // If all methods fail but we have permanent storage, use it
        const permanentUrl = localStorage.getItem(`user_profile_${username}`);
        if (permanentUrl && permanentUrl !== 'null') {
            console.log('⚠️ Using permanent storage (server fetch failed)');
            return { success: true, imageUrl: permanentUrl, fromPermanent: true };
        }
        
        console.log('⚠️ No profile picture found for:', username);
        return { success: false, imageUrl: null };
    },
    
    async forceRefreshProfilePicture(username) {
        console.log('🔄 Force refreshing profile picture from sheet...');
        return await this.fetchProfileFromServer(username);
    },
    
    // Get profile picture synchronously (for chat messages, etc.)
    getProfilePictureSync(username) {
        const permanentKey = `user_profile_${username}`;
        const url = localStorage.getItem(permanentKey);
        if (url && url !== 'null') {
            return url;
        }
        
        const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
        if (userData.username === username && userData.profilePic) {
            return userData.profilePic;
        }
        
        return null;
    },

    // ========== CHAT SYSTEM SUPPORT ==========
    
    async loadChatMessages() {
        if (!CONFIG.CHAT_API_URL) return [];
        
        try {
            const response = await this.fetchWithCorsProxy({ action: 'load' });
            return response.messages || [];
        } catch (error) {
            console.error('Load chat messages error:', error);
            return [];
        }
    },
    
    async sendChatMessage(messageData) {
        if (!CONFIG.CHAT_API_URL) return false;
        
        try {
            const result = await this.fetchWithCorsProxy(messageData);
            return result.success === true;
        } catch (error) {
            console.error('Send chat message error:', error);
            return false;
        }
    },

    // ========== TEST & DEBUG FUNCTIONS ==========
    
    async testConnection() {
        console.log('🔗 Testing connection to Apps Script...');
        
        try {
            const result = await this.fetchWithCorsProxy({ action: 'test' });
            console.log('Connection test result:', result);
            return result;
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Check if CORS proxy is working
    async testCorsProxy() {
        try {
            const response = await fetch('https://cors-anywhere-90um.onrender.com/https://httpbin.org/get');
            const data = await response.json();
            console.log('✅ CORS proxy is working:', data);
            return true;
        } catch (error) {
            console.error('❌ CORS proxy failed:', error);
            return false;
        }
    },
    
    // Clear all profile caches
    clearAllProfileCaches() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('profile_cache_') || key.startsWith('user_profile_')) {
                localStorage.removeItem(key);
                console.log('Removed cache:', key);
            }
        });
        console.log('✅ All profile caches cleared');
    },
    
    clearProfileCache(username) {
        if (username) {
            localStorage.removeItem(`profile_cache_${username}`);
            localStorage.removeItem(`profile_cache_${username}_time`);
            localStorage.removeItem(`user_profile_${username}`);
            console.log('Cache cleared for:', username);
        } else {
            this.clearAllProfileCaches();
        }
    },
    
    // Check current environment
    getEnvironment() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        let env = 'unknown';
        if (protocol === 'file:') env = 'android_editor';
        else if (hostname === 'localhost' || hostname === '127.0.0.1') env = 'localhost';
        else if (hostname.includes('github.io')) env = 'github_pages';
        else if (protocol === 'https:') env = 'https_server';
        else if (protocol === 'http:') env = 'http_server';
        
        console.log('🌍 Environment:', env, 'Protocol:', protocol, 'Host:', hostname);
        return { env, protocol, hostname };
    }
};

// Auto-detect environment and log
APIService.getEnvironment();

// Make sure CORS proxy is ready (first time use)
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            // Check if we need to warm up CORS proxy
            if (localStorage.getItem('cors_proxy_warmed') !== 'true') {
                APIService.testCorsProxy().then(() => {
                    localStorage.setItem('cors_proxy_warmed', 'true');
                });
            }
        }, 2000);
    });
}
