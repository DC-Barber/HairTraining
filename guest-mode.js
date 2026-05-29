// guest-mode.js - Fill credentials from sheet

const GuestMode = {
    SHEET_ID: '1JOeXdjVD0uiCmKjw2AokfgQxLxOBifFqPt0rqhynupM',
    GUEST_TAB_GID: '1207060452',
    
    getSheetAPIUrl: function() {
        return `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.GUEST_TAB_GID}`;
    },
    
    loadGuestAccounts: async function() {
        try {
            const response = await fetch(this.getSheetAPIUrl());
            let text = await response.text();
            
            text = text.replace(/^\/\*O_o\*\//, '');
            text = text.replace('google.visualization.Query.setResponse(', '');
            text = text.replace(/\);$/, '');
            
            const data = JSON.parse(text);
            const rows = data.table.rows;
            const cols = data.table.cols || [];
            
            let usernameCol = 0;
            let passwordCol = 1;
            
            for (let i = 0; i < cols.length; i++) {
                const label = (cols[i].label || '').toLowerCase();
                if (label === 'username') usernameCol = i;
                if (label === 'password') passwordCol = i;
            }
            
            const accounts = [];
            const startRow = (rows[0]?.c[usernameCol]?.v === 'username') ? 1 : 0;
            
            for (let i = startRow; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row.c) continue;
                
                const username = row.c[usernameCol]?.v;
                const password = row.c[passwordCol]?.v;
                
                if (username && username.toString().trim() !== '') {
                    accounts.push({
                        username: username.toString().trim(),
                        password: password ? password.toString().trim() : ''
                    });
                }
            }
            
            console.log(`✅ Loaded ${accounts.length} guest accounts`);
            return accounts;
        } catch (error) {
            console.error('Guest mode error:', error);
            return [];
        }
    },
    
    getRandomAccount: async function() {
        const accounts = await this.loadGuestAccounts();
        if (accounts.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * accounts.length);
        return accounts[randomIndex];
    },
    
    fillCredentials: async function() {
        const btn = document.getElementById('guest-mode-btn');
        
        // Show loading on button if exists
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Loading...';
            btn.style.opacity = '0.6';
        }
        
        // Clear old page state
        localStorage.removeItem('currentPage');
        localStorage.removeItem('hairTraining_currentPage');
        
        // Set guest mode flag
        localStorage.setItem('guest_mode_active', 'true');
        console.log('Guest mode: flag set');
        
        const account = await this.getRandomAccount();
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🎭 Guest User';
            btn.style.opacity = '1';
        }
        
        if (!account) {
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.style.color = 'red';
                errorDiv.textContent = '❌ No guest accounts available';
            }
            return;
        }
        
        // Wait for input fields to exist (modal might not be ready yet)
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max
        
        const fillAndSubmit = setInterval(() => {
            const usernameField = document.getElementById('login-username');
            const passwordField = document.getElementById('login-password');
            
            if (usernameField && passwordField) {
                clearInterval(fillAndSubmit);
                usernameField.value = account.username;
                passwordField.value = account.password;
                console.log('✅ Guest credentials filled:', account.username);
                
                // Auto submit
                const submitBtn = document.getElementById('login-submit-btn');
                if (submitBtn) {
                    setTimeout(() => {
                        submitBtn.click();
                    }, 100);
                }
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(fillAndSubmit);
                console.error('❌ Could not find login form fields');
                const errorDiv = document.getElementById('login-error');
                if (errorDiv) {
                    errorDiv.style.color = 'red';
                    errorDiv.textContent = '❌ Login form not ready. Please try again.';
                }
            }
        }, 100);
    },
    
    init: function() {
        // Wait for modal to be created and attach event to guest button
        const attachEvent = () => {
            const guestBtn = document.getElementById('guest-mode-btn');
            if (guestBtn && !guestBtn.hasListener) {
                guestBtn.hasListener = true;
                guestBtn.onclick = () => this.fillCredentials();
                console.log('✅ Guest button event attached');
                return true;
            }
            return false;
        };
        
        // Try immediately
        if (attachEvent()) return;
        
        // If not found, observe DOM changes
        const observer = new MutationObserver(() => {
            if (attachEvent()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Timeout fallback - remove observer after 10 seconds
        setTimeout(() => observer.disconnect(), 10000);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GuestMode.init());
} else {
    GuestMode.init();
}