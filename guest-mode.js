// guest-mode.js - Only fills username/password + clears old page state

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
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳...';
        }
        
        // 🔥 Clear old page state before filling credentials
        localStorage.removeItem('currentPage');
        localStorage.removeItem('hairTraining_currentPage');
        console.log('Guest mode: cleared old page state');
        
        const account = await this.getRandomAccount();
        
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🎭 Guest User';
        }
        
        if (!account) {
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.style.color = 'red';
                errorDiv.textContent = '❌ No guest accounts available';
            }
            return;
        }
        
        const usernameField = document.getElementById('login-username');
        const passwordField = document.getElementById('login-password');
        
        if (usernameField) usernameField.value = account.username;
        if (passwordField) passwordField.value = account.password;
    },
    
    addGuestButton: function() {
        const checkModal = setInterval(() => {
            const modal = document.getElementById('auth-modal-overlay');
            if (modal && !document.getElementById('guest-mode-btn')) {
                const container = modal.querySelector('div');
                if (container) {
                    const guestBtn = document.createElement('button');
                    guestBtn.id = 'guest-mode-btn';
                    guestBtn.textContent = '🎭 Guest User';
                    guestBtn.style.cssText = 'width:100%;padding:12px;background:#6c757d;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:0.9rem;margin-top:10px;';
                    guestBtn.onclick = () => this.fillCredentials();
                    
                    const submitBtn = document.getElementById('login-submit-btn');
                    const togglePara = document.querySelector('#auth-modal-overlay p:last-of-type');
                    
                    if (submitBtn && submitBtn.parentNode) {
                        if (togglePara) {
                            submitBtn.parentNode.insertBefore(guestBtn, togglePara);
                        } else {
                            submitBtn.parentNode.appendChild(guestBtn);
                        }
                    } else {
                        container.appendChild(guestBtn);
                    }
                    
                    clearInterval(checkModal);
                }
            }
        }, 200);
    },
    
    init: function() {
        this.addGuestButton();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GuestMode.init());
} else {
    GuestMode.init();
}