// api-service.js - Full Updated Version

const APIService = {
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

    // Upload profile picture to ImgBB + Google Sheet
    async uploadProfilePicture(file, username, fullname) {
        try {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
            });
            
            const deviceId = localStorage.getItem('device_id') || await this.getDeviceId();
            
            // Try without CORS proxy first
            let response;
            try {
                response = await fetch(CONFIG.IMGBB_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'upload',
                        imageBase64: base64,
                        username: username,
                        fullname: fullname || '',
                        deviceId: deviceId
                    })
                });
            } catch (corsError) {
                console.warn('Direct fetch failed, using CORS proxy:', corsError);
                const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
                response = await fetch(CORS_PROXY + CONFIG.IMGBB_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'upload',
                        imageBase64: base64,
                        username: username,
                        fullname: fullname || '',
                        deviceId: deviceId
                    })
                });
            }
            
            const result = await response.json();
            
            if (result.success && result.imageUrl) {
                // Update local storage with new image
                const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
                userData.profilePic = result.imageUrl;
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                
                // Update cache
                if (username) {
                    localStorage.setItem(`profile_cache_${username}`, result.imageUrl);
                    localStorage.setItem(`profile_cache_${username}_time`, Date.now().toString());
                }
                
                return { success: true, imageUrl: result.imageUrl };
            } else {
                return { success: false, error: result.message || 'Upload failed' };
            }
        } catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get profile picture by username from Google Sheet (with caching)
    async getProfilePicture(username, forceRefresh = false) {
        if (!username) {
            console.warn('No username provided');
            return { success: false, imageUrl: null };
        }
        
        // Check cache first (unless force refresh)
        const cacheKey = `profile_cache_${username}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        
        if (!forceRefresh && cached && cacheTime && cached !== 'null') {
            const age = Date.now() - parseInt(cacheTime);
            if (age < 5 * 60 * 1000) { // Cache for 5 minutes
                console.log('📦 Using cached profile picture for:', username);
                return { success: true, imageUrl: cached, fromCache: true };
            }
        }
        
        console.log('🔍 Fetching profile picture from server for:', username);
        
        try {
            const response = await fetch(CONFIG.IMGBB_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getProfilePic',
                    username: username
                })
            });
            
            const result = await response.json();
            console.log('📸 Server response:', result);
            
            if (result.success && result.imageUrl && result.imageUrl !== 'null') {
                // Update cache
                localStorage.setItem(cacheKey, result.imageUrl);
                localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
                
                // Also update main user data
                const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
                if (userData.profilePic !== result.imageUrl) {
                    userData.profilePic = result.imageUrl;
                    localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                }
                
                return { success: true, imageUrl: result.imageUrl };
            } else {
                console.log('⚠️ No profile picture found for:', username);
                return { success: false, imageUrl: null, message: result.message };
            }
        } catch (error) {
            console.error('❌ Get profile picture error:', error);
            return { success: false, imageUrl: null, error: error.message };
        }
    },

    // Force refresh profile picture (ignore cache)
    async forceRefreshProfilePicture(username) {
        console.log('🔄 Force refreshing profile picture from sheet...');
        return await this.getProfilePicture(username, true);
    },

    // Test connection to Apps Script
    async testConnection() {
        try {
            const response = await fetch(CONFIG.IMGBB_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test' })
            });
            const result = await response.json();
            console.log('🔗 Connection test:', result);
            return result;
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Clear profile picture cache for a user
    clearProfileCache(username) {
        if (username) {
            localStorage.removeItem(`profile_cache_${username}`);
            localStorage.removeItem(`profile_cache_${username}_time`);
            console.log('Cache cleared for:', username);
        } else {
            // Clear all profile caches
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('profile_cache_')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('All profile caches cleared');
        }
    }
};