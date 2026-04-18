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

    // ✅ တကယ့် Unique Device ID ရယူခြင်း
    async getDeviceId() {
        try {
            // FingerprintJS ကို အသုံးပြုပါ
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            return result.visitorId;
        } catch (e) {
            // Fallback - ပိုမိုကောင်းမွန်တဲ့ method
            return this.getEnhancedFallbackId();
        }
    },

    // ✅ Fallback Device ID (User-Agent ထက် ပိုကောင်းတယ်)
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
        
        // Simple hash function
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
    }
};