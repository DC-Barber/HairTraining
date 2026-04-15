// api-service.js
const APIService = {
    async getIP() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            return data.ip;
        } catch (e) { return "Unknown"; }
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
