    

    
 // reg.js - Login + Register with Admin Approval & 24h Session
(function() {
    // ==================== CONFIGURATION ====================
    const USERS_SHEET_API = 'https://script.google.com/macros/s/AKfycbzRBGdr-6wX0fvrkZ0B6DPlKdF0yvXzWzxV2nbra-916H3HkuCcpNwNRYicRU6LKencjg/exec';
    const HISTORY_SHEET_API = 'https://script.google.com/macros/s/AKfycbxEarnFSqXxG16vLEKJ7nwbCQcGNbQTEf7a-XVzSuuEgDY5DHqcwJ4uIraqK0x-ZzYL/exec';
    
    const SESSION_HOURS = 24;
    const AUTH_TOKEN_KEY = 'hair_auth_token';
    const AUTH_EXPIRY_KEY = 'hair_auth_expiry';
    const USER_DATA_KEY = 'hair_user_data';
    
    let loginOverlay = null;
    let isRegisterMode = false;
    
    // Helper: Fetch with timeout and error handling
    async function fetchWithTimeout(url, options, timeout = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // Get device fingerprint
    async function getDeviceId() {
        if (window.FingerprintJS) {
            try {
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                return result.visitorId;
            } catch(e) {
                console.warn('FingerprintJS failed:', e);
            }
        }
        let fallbackId = localStorage.getItem('fallback_device_id');
        if (!fallbackId) {
            fallbackId = 'device_' + Math.random().toString(36).substr(2, 16);
            localStorage.setItem('fallback_device_id', fallbackId);
        }
        return fallbackId;
    }
    
    // Get IP address
    async function getIpAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json', { mode: 'cors' });
            const data = await response.json();
            return data.ip;
        } catch (e) {
            console.warn('IP fetch failed:', e);
            return 'unknown';
        }
    }
    
    // Check authentication
    function isAuthenticated() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
        if (!token || !expiry) return false;
        const now = new Date().getTime();
        if (now > parseInt(expiry)) {
            clearAuthData();
            return false;
        }
        return true;
    }
    
    function clearAuthData() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_EXPIRY_KEY);
        localStorage.removeItem(USER_DATA_KEY);
    }
    
    // Save session
    function setAuthSession(username) {
        const now = new Date().getTime();
        const expiry = now + (SESSION_HOURS * 60 * 60 * 1000);
        const token = btoa(unescape(encodeURIComponent(JSON.stringify({
            user: username,
            time: now,
            expires: expiry
        }))));
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_EXPIRY_KEY, expiry.toString());
    }
    
    function saveUserData(username, phone, fullname) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify({
            username: username,
            phone: phone,
            fullname: fullname
        }));
    }
    
    function getUserData() {
        const data = localStorage.getItem(USER_DATA_KEY);
        if (data) {
            try {
                return JSON.parse(data);
            } catch(e) {
                return null;
            }
        }
        return null;
    }
    
    function autoFillLoginForm() {
        const userData = getUserData();
        if (userData && userData.username) {
            const usernameInput = document.getElementById('login-username');
            if (usernameInput) {
                usernameInput.value = userData.username;
            }
        }
    }
    
    // ========== LOGOUT FUNCTION (FIXED) ==========
    window.logout = function() {
        clearAuthData();
        // Remove overlay if exists
        if (loginOverlay) {
            loginOverlay.remove();
            loginOverlay = null;
        }
        // Reset register mode
        isRegisterMode = false;
        // Show login modal again
        showLoginModal();
    };
    
    // Register logout button (for backward compatibility)
    window.registerLogoutButton = function(buttonElement) {
        if (buttonElement) {
            buttonElement.addEventListener('click', () => window.logout());
        }
    };
    
    async function recordLoginHistory(username, deviceId, ipAddress) {
        try {
            await fetchWithTimeout(HISTORY_SHEET_API, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'addHistory',
                    username: username,
                    deviceId: deviceId,
                    ipAddress: ipAddress,
                    browserInfo: navigator.userAgent
                })
            });
        } catch(e) {
            console.error('History recording failed:', e);
        }
    }
    
    async function handleLogin(username, password, deviceId, ipAddress) {
        const response = await fetchWithTimeout(USERS_SHEET_API, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password,
                deviceId: deviceId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }
    
    async function handleRegister(username, password, phone, fullname, deviceId) {
        const response = await fetchWithTimeout(USERS_SHEET_API, {
            method: 'POST',
            body: JSON.stringify({
                action: 'register',
                username: username,
                password: password,
                phone: phone,
                fullname: fullname,
                deviceId: deviceId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }
    
    async function onSubmit() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const errorMsg = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit-btn');
        
        if (!username || !password) {
            errorMsg.innerText = '❌ Username and password required';
            return;
        }
        
        if (isRegisterMode) {
            const phone = document.getElementById('register-phone').value.trim();
            const fullname = document.getElementById('register-fullname').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();
            
            if (!phone || !fullname) {
                errorMsg.innerText = '❌ Phone number and full name required';
                return;
            }
            if (password !== confirmPassword) {
                errorMsg.innerText = '❌ Passwords do not match';
                return;
            }
            if (password.length < 4) {
                errorMsg.innerText = '❌ Password must be at least 4 characters';
                return;
            }
            
            errorMsg.innerText = '⏳ Registering...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            
            try {
                const deviceId = await getDeviceId();
                const result = await handleRegister(username, password, phone, fullname, deviceId);
                
                if (result.status === 'success') {
                    saveUserData(username, phone, fullname);
                    errorMsg.style.color = '#28a745';
                    errorMsg.innerText = '✅ Registration successful! Pending admin approval. Please wait.';
                    setTimeout(() => {
                        toggleMode();
                        errorMsg.style.color = '#d9534f';
                        errorMsg.innerText = '';
                    }, 3000);
                } else {
                    errorMsg.innerText = '❌ ' + result.message;
                }
            } catch (error) {
                console.error('Register error:', error);
                errorMsg.innerText = '❌ Network error. Please check connection and try again.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            
        } else {
            errorMsg.innerText = '⏳ Logging in...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            
            try {
                const deviceId = await getDeviceId();
                const ipAddress = await getIpAddress();
                const result = await handleLogin(username, password, deviceId, ipAddress);
                
                if (result.status === 'success') {
                    setAuthSession(username);
                    saveUserData(username, result.phone, result.fullname);
                    await recordLoginHistory(username, deviceId, ipAddress);
                    
                    // Remove login overlay
                    if (loginOverlay) {
                        loginOverlay.remove();
                        loginOverlay = null;
                    }
                    document.body.style.overflow = 'auto';
                    window.dispatchEvent(new CustomEvent('authSuccess', { detail: { username } }));
                } else {
                    errorMsg.innerText = '❌ ' + result.message;
                }
            } catch (error) {
                console.error('Login error:', error);
                errorMsg.innerText = '❌ Network error. Please check connection and try again.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        }
    }
    
    function toggleMode() {
        isRegisterMode = !isRegisterMode;
        const modeText = document.getElementById('mode-toggle-text');
        const toggleBtn = document.getElementById('mode-toggle-btn');
        const submitBtn = document.getElementById('login-submit-btn');
        const registerFields = document.getElementById('register-fields');
        
        if (isRegisterMode) {
            modeText.innerText = 'Already have an account?';
            toggleBtn.innerText = 'Login';
            submitBtn.innerText = 'Register';
            if (registerFields) registerFields.style.display = 'block';
        } else {
            modeText.innerText = "Don't have an account?";
            toggleBtn.innerText = 'Register';
            submitBtn.innerText = 'Login';
            if (registerFields) registerFields.style.display = 'none';
            autoFillLoginForm();
        }
        
        const errorMsg = document.getElementById('login-error');
        if (errorMsg) errorMsg.innerText = '';
        
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
    }
    
    function showLoginModal() {
        // If already authenticated, don't show login
        if (isAuthenticated()) {
            console.log("Already authenticated, no need for login");
            return;
        }
        
        // If overlay already exists, remove it first then recreate
        if (loginOverlay) {
            loginOverlay.remove();
            loginOverlay = null;
        }
        
        loginOverlay = document.createElement('div');
        loginOverlay.id = 'login-overlay';
        loginOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f2b46 100%);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            backdrop-filter: blur(8px);
        `;
        
        const card = document.createElement('div');
        card.style.cssText = `
            background: white;
            border-radius: 48px;
            width: 90%;
            max-width: 400px;
            padding: 40px 28px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
            text-align: center;
            animation: fadeInUp 0.4s ease;
        `;
        
        card.innerHTML = `
            <div style="margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 12px;">💇</div>
                <h2 style="color: #1e3a5f; font-size: 1.9rem; margin-bottom: 8px;">Professional Hair Training Manual</h2>
                <p style="color: #7c6e5d; font-size: 0.85rem;">Professional Hair Training Access</p>
            </div>
            <div style="margin-bottom: 16px;">
                <input type="text" id="login-username" placeholder="Username" style="width: 100%; padding: 14px 18px; border: 1.5px solid #e2d5c5; border-radius: 60px; font-size: 1rem; margin-bottom: 14px; outline: none; transition: 0.2s;">
                <input type="password" id="login-password" placeholder="Password" style="width: 100%; padding: 14px 18px; border: 1.5px solid #e2d5c5; border-radius: 60px; font-size: 1rem; outline: none; transition: 0.2s;">
                <div id="register-fields" style="display: none;">
                    <input type="tel" id="register-phone" placeholder="Phone Number" style="width: 100%; padding: 14px 18px; border: 1.5px solid #e2d5c5; border-radius: 60px; font-size: 1rem; margin-bottom: 14px; outline: none; transition: 0.2s;">
                    <input type="text" id="register-fullname" placeholder="Full Name" style="width: 100%; padding: 14px 18px; border: 1.5px solid #e2d5c5; border-radius: 60px; font-size: 1rem; margin-bottom: 14px; outline: none; transition: 0.2s;">
                    <input type="password" id="confirm-password" placeholder="Confirm Password" style="width: 100%; padding: 14px 18px; border: 1.5px solid #e2d5c5; border-radius: 60px; font-size: 1rem; outline: none; transition: 0.2s;">
                </div>
            </div>
            <div id="login-error" style="color: #d9534f; font-size: 0.8rem; margin-bottom: 16px; min-height: 40px;"></div>
            <button id="login-submit-btn" style="background: #1e3a5f; color: white; border: none; width: 100%; padding: 14px; border-radius: 60px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s;">Login</button>
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 8px; font-size: 0.85rem;">
                <span id="mode-toggle-text" style="color: #7c6e5d;">Don't have an account?</span>
                <button id="mode-toggle-btn" style="background: none; border: none; color: #1e3a5f; font-weight: bold; cursor: pointer; text-decoration: underline;">Register</button>
            </div>
            <p style="margin-top: 24px; font-size: 0.7rem; color: #aaa;">Authorized Personnel Only</p>
        `;
        
        loginOverlay.appendChild(card);
        document.body.appendChild(loginOverlay);
        
        const style = document.createElement('style');
        style.textContent = `@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }`;
        document.head.appendChild(style);
        
        document.getElementById('login-submit-btn').addEventListener('click', onSubmit);
        document.getElementById('mode-toggle-btn').addEventListener('click', toggleMode);
        
        ['login-username', 'login-password', 'register-phone', 'register-fullname', 'confirm-password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('focus', () => el.style.borderColor = '#1e3a5f');
                el.addEventListener('blur', () => el.style.borderColor = '#e2d5c5');
                el.addEventListener('keypress', (e) => { if (e.key === 'Enter') onSubmit(); });
            }
        });
        
        autoFillLoginForm();
    }
    
    function initAuth() {
        if (isAuthenticated()) {
            console.log("Already authenticated, session valid");
            return;
        }
        console.log("Not authenticated, showing login modal");
        document.body.style.overflow = 'hidden';
        showLoginModal();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();