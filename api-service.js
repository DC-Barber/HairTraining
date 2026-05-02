// api-service.js
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

 // api-service.js - ImgBB တိုက်ရိုက်သုံးနည်း

async uploadProfilePicture(file, username, fullname) {
    try {
        // File to Base64
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
        });
        
        // ✅ ImgBB တိုက်ရိုက် (CORS proxy မလို)
        const formData = new FormData();
        formData.append('image', base64);
        formData.append('key', CONFIG.IMGBB_API_KEY);
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const imageUrl = result.data.url;
            
            // Optional: Store to your Apps Script
            const deviceId = localStorage.getItem('device_id') || await this.getDeviceId();
            const storeResponse = await fetch(CONFIG.IMGBB_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: imageUrl,
                    username: username,
                    fullname: fullname || '',
                    deviceId: deviceId
                })
            });
            
            return { success: true, imageUrl: imageUrl };
        } else {
            return { success: false, error: result.error?.message || 'Upload failed' };
        }
    } catch (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
    }
}
};