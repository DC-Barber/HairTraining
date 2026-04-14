// reg.js - Login + Register with Admin Approval & 24h Session (Optimized for GitHub Hosting)
(function() {
    // ==================== CONFIGURATION ====================
    // သင်၏ Web App URL (Deploy လုပ်ထားသော .../exec link ဖြစ်ရမည်)
    const USERS_SHEET_API = 'https://script.google.com/macros/s/AKfycbzRBGdr-6wX0fvrkZ0B6DPlKdF0yvXzWzxV2nbra-916H3HkuCcpNwNRYicRU6LKencjg/exec';
    const HISTORY_SHEET_API = 'https://script.google.com/macros/s/AKfycbxEarnFSqXxG16vLEKJ7nwbCQcGNbQTEf7a-XVzSuuEgDY5DHqcwJ4uIraqK0x-ZzYL/exec';
    
    const SESSION_HOURS = 24;
    const AUTH_TOKEN_KEY = 'hair_auth_token';
    const AUTH_EXPIRY_KEY = 'hair_auth_expiry';
    const USER_DATA_KEY = 'hair_user_data';
    
    let loginOverlay = null;
    let isRegisterMode = false;
    
    // Helper: Fetch with timeout and CORS/Redirect handling
    async function fetchWithTimeout(url, options, timeout = 20000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                // GitHub မှ Google Apps Script သို့ ခေါ်ယူရာတွင် redirection လိုက်နာရန် အရေးကြီးသည်
                redirect: 'follow', 
                headers: {
                    // JSON အစား text/plain သုံးခြင်းဖြင့် Pre-flight (OPTIONS) request ပြဿနာကို ရှောင်ရှားနိုင်သည်
                    'Content-Type': 'text/plain;charset=utf-8',
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
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (e) {
            console.warn('IP fetch failed:', e);
            return 'unknown';
        }
    }
    
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
            try { return JSON.parse(data); } catch(e) { return null; }
        }
        return null;
    }
    
    function autoFillLoginForm() {
        const userData = getUserData();
        if (userData && userData.username) {
            const usernameInput = document.getElementById('login-username');
            if (usernameInput) usernameInput.value = userData.username;
        }
    }
    
    window.logout = function() {
        clearAuthData();
        if (loginOverlay) {
            loginOverlay.remove();
            loginOverlay = null;
        }
        isRegisterMode = false;
        showLoginModal();
        location.reload(); // Session အကုန်ရှင်းရန် Page ကို reload လုပ်ခြင်း
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
        
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
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
        
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
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
        
        errorMsg.style.color = '#d9534f'; 

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
                    errorMsg.innerText = '✅ Registration successful! Please wait for admin approval.';
                    setTimeout(() => {
                        toggleMode();
                        errorMsg.innerText = '';
                    }, 4000);
                } else {
                    errorMsg.innerText = '❌ ' + result.message;
                }
            } catch (error) {
                errorMsg.innerText = '❌ Network error. Check your connection.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            
        } else {
            errorMsg.innerText = '⏳ Logging in...';
            submitBtn.disabled = true;
            
            try {
                const deviceId = await getDeviceId();
                const ipAddress = await getIpAddress();
                const result = await handleLogin(username, password, deviceId, ipAddress);
                
                if (result.status === 'success') {
                    setAuthSession(username);
                    saveUserData(username, result.phone, result.fullname);
                    await recordLoginHistory(username, deviceId, ipAddress);
                    
                    if (loginOverlay) loginOverlay.remove();
                    document.body.style.overflow = 'auto';
                    window.dispatchEvent(new CustomEvent('authSuccess', { detail: { username } }));
                } else {
                    errorMsg.innerText = '❌ ' + result.message;
                }
            } catch (error) {
                errorMsg.innerText = '❌ Connection failed. Try again.';
            } finally {
                submitBtn.disabled = false;
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
            registerFields.style.display = 'block';
        } else {
            modeText.innerText = "Don't have an account?";
            toggleBtn.innerText = 'Register';
            submitBtn.innerText = 'Login';
            registerFields.style.display = 'none';
            autoFillLoginForm();
        }
        document.getElementById('login-error').innerText = '';
    }
    
    function showLoginModal() {
        if (isAuthenticated()) return;
        
        if (loginOverlay) loginOverlay.remove();
        
        loginOverlay = document.createElement('div');
        loginOverlay.id = 'login-overlay';
        loginOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f2b46 100%);
            z-index: 10000; display: flex; justify-content: center; align-items: center;
            font-family: sans-serif; backdrop-filter: blur(8px);
        `;
        
        const card = document.createElement('div');
        card.className = 'login-card';
        card.style.cssText = `
            background: white; border-radius: 30px; width: 90%; max-width: 380px;
            padding: 35px 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: center;
        `;
        
        card.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 45px;">💇</div>
                <h2 style="color: #1e3a5f; margin: 10px 0;">Hair Training</h2>
                <p style="color: #666; font-size: 0.9rem;">Authorized Personnel Only</p>
            </div>
            <div style="margin-bottom: 15px;">
                <input type="text" id="login-username" placeholder="Username" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 25px; margin-bottom: 10px; outline: none;">
                <input type="password" id="login-password" placeholder="Password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 25px; outline: none;">
                <div id="register-fields" style="display: none; margin-top: 10px;">
                    <input type="tel" id="register-phone" placeholder="Phone Number" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 25px; margin-bottom: 10px; outline: none;">
                    <input type="text" id="register-fullname" placeholder="Full Name" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 25px; margin-bottom: 10px; outline: none;">
                    <input type="password" id="confirm-password" placeholder="Confirm Password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 25px; outline: none;">
                </div>
            </div>
            <div id="login-error" style="color: #d9534f; font-size: 0.85rem; min-height: 20px; margin-bottom: 15px;"></div>
            <button id="login-submit-btn" style="background: #1e3a5f; color: white; border: none; width: 100%; padding: 12px; border-radius: 25px; font-weight: bold; cursor: pointer;">Login</button>
            <div style="margin-top: 20px; font-size: 0.85rem;">
                <span id="mode-toggle-text">Don't have an account?</span>
                <button id="mode-toggle-btn" style="background: none; border: none; color: #1e3a5f; font-weight: bold; cursor: pointer; text-decoration: underline;">Register</button>
            </div>
        `;
        
        loginOverlay.appendChild(card);
        document.body.appendChild(loginOverlay);
        
        document.getElementById('login-submit-btn').addEventListener('click', onSubmit);
        document.getElementById('mode-toggle-btn').addEventListener('click', toggleMode);
        
        autoFillLoginForm();
    }
    
    function initAuth() {
        if (isAuthenticated()) {
            console.log("Auth Active");
            return;
        }
        document.body.style.overflow = 'hidden';
        showLoginModal();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();
