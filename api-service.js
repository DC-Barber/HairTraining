// api-service.js - Full Updated Version with Chat-Style Profile Sync

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
                // Update local storage
                const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
                userData.profilePic = result.imageUrl;
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                
                // Update cache
                if (username) {
                    localStorage.setItem(`profile_cache_${username}`, result.imageUrl);
                    localStorage.setItem(`profile_cache_${username}_time`, Date.now().toString());
                }
                
                // Also store in a separate permanent key (like chat system)
                localStorage.setItem(`user_profile_${username}`, result.imageUrl);
                
                return { success: true, imageUrl: result.imageUrl };
            } else {
                return { success: false, error: result.message || 'Upload failed' };
            }
        } catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get profile picture - Chat System Style (always check server first for other devices)
    async getProfilePicture(username, forceRefresh = false) {
        if (!username) {
            console.warn('No username provided');
            return { success: false, imageUrl: null };
        }
        
        // Check permanent storage first (cross-device sync)
        const permanentKey = `user_profile_${username}`;
        const permanentUrl = localStorage.getItem(permanentKey);
        
        // If force refresh, skip cache and go to server
        if (forceRefresh) {
            console.log('🔄 Force refresh - fetching from server');
            return await this.fetchProfileFromServer(username);
        }
        
        // Check cache (5 minutes)
        const cacheKey = `profile_cache_${username}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        
        if (cached && cacheTime && cached !== 'null') {
            const age = Date.now() - parseInt(cacheTime);
            if (age < 5 * 60 * 1000) {
                console.log('📦 Using cached profile picture for:', username);
                return { success: true, imageUrl: cached, fromCache: true };
            }
        }
        
        // If we have a permanent URL but cache expired, still show it while fetching fresh
        if (permanentUrl && permanentUrl !== 'null') {
            console.log('📦 Using permanent storage, fetching fresh in background');
            // Fetch in background
            this.fetchProfileFromServer(username).then(result => {
                if (result.success && result.imageUrl !== permanentUrl) {
                    console.log('🔄 Updated profile picture from background sync');
                }
            }).catch(err => console.error('Background sync failed:', err));
            return { success: true, imageUrl: permanentUrl, fromPermanent: true };
        }
        
        // No cache, fetch from server
        return await this.fetchProfileFromServer(username);
    },
    
    // Internal: Fetch from server and update all storages
    async fetchProfileFromServer(username) {
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
                // Update all storage locations
                const cacheKey = `profile_cache_${username}`;
                const permanentKey = `user_profile_${username}`;
                
                localStorage.setItem(cacheKey, result.imageUrl);
                localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
                localStorage.setItem(permanentKey, result.imageUrl);
                
                // Update main user data
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

    // Force refresh profile picture (ignore all cache)
    async forceRefreshProfilePicture(username) {
        console.log('🔄 Force refreshing profile picture from sheet...');
        return await this.fetchProfileFromServer(username);
    },
    
    // Get profile picture for chat message display (synchronous, from storage)
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
            localStorage.removeItem(`user_profile_${username}`);
            console.log('Cache cleared for:', username);
        } else {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('profile_cache_') || key.startsWith('user_profile_')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('All profile caches cleared');
        }
    }
};