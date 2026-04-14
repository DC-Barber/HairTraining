// reg.js - Login + Register with Enhanced Validation & GitHub Hosting Support
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

    // Helper: Fetch with timeout and CORS/Redirect handling
    async function fetchWithTimeout(url, options, timeout = 20000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                redirect: 'follow', 
                headers: {
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

    // Auth functions
    function isAuthenticated() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
        if (!token || !expiry) return false;
        return new Date().getTime() <= parseInt(expiry);
    }

    function clearAuthData() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_EXPIRY_KEY);
        localStorage.removeItem(USER_DATA_KEY);
    }

    window.logout = function() {
        clearAuthData();
        location.reload();
    };

    // Validation Functions
    function validatePassword(pw) {
        // အနည်းဆုံး အက္ခရာတစ်လုံးနှင့် ဂဏန်းတစ်လုံး ပါရမည်
        return /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
    }

    async function onSubmit() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const errorMsg = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit-btn');
        
        errorMsg.style.color = '#d9534f';

        if (!username || !password) {
            errorMsg.innerText = '❌ Username နှင့် Password ရိုက်ထည့်ပါ';
            return;
        }

        if (isRegisterMode) {
            const countryCode = document.getElementById('country-code').value;
            const phoneInput = document.getElementById('register-phone').value.trim();
            const fullname = document.getElementById('register-fullname').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();
            
            // 1. Username Validation (Max 10)
            if (username.length > 10) {
                errorMsg.innerText = '❌ Username သည် ၁၀ လုံးထက်မကျော်ရပါ';
                return;
            }

            // 2. Password Validation (Letter + Number)
            if (!validatePassword(password)) {
                errorMsg.innerText = '❌ Password တွင် အက္ခရာနှင့် ဂဏန်း နှစ်မျိုးစလုံးပါရမည်';
                return;
            }

            if (password !== confirmPassword) {
                errorMsg.innerText = '❌ Passwords များ မတူညီပါ';
                return;
            }

            // 3. Phone Validation (Fixed 9 digits)
            if (phoneInput.length !== 9 || !/^\d+$/.test(phoneInput)) {
                errorMsg.innerText = '❌ ဖုန်းနံပတ်သည် ဂဏန်း ၉ လုံး အတိအကျဖြစ်ရမည်';
                return;
            }

            const fullPhone = countryCode + phoneInput; // e.g., +959791234567

            errorMsg.innerText = '⏳ စာရင်းသွင်းနေသည်...';
            submitBtn.disabled = true;

            try {
                const response = await fetchWithTimeout(USERS_SHEET_API, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'register',
                        username, password, phone: fullPhone, fullname,
                        deviceId: 'dev_' + Math.random().toString(36).substr(2, 9)
                    })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    errorMsg.style.color = '#28a745';
                    errorMsg.innerText = '✅ အောင်မြင်သည်။ Admin အတည်ပြုချက်ကို စောင့်ပါ။';
                    setTimeout(toggleMode, 3000);
                } else {
                    errorMsg.innerText = '❌ ' + result.message;
                }
            } catch (e) {
                errorMsg.innerText = '❌ ချိတ်ဆက်မှု အဆင်မပြေပါ။';
            } finally {
                submitBtn.disabled = false;
            }

        } else {
            // Login Logic
            errorMsg.innerText = '⏳ ဝင်ရောက်နေသည်...';
            submitBtn.disabled = true;
            try {
                const response = await fetchWithTimeout(USERS_SHEET_API, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'login', username, password })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    const expiry = new Date().getTime() + (SESSION_HOURS * 60 * 60 * 1000);
                    localStorage.setItem(AUTH_TOKEN_KEY, 'active');
                    localStorage.setItem(AUTH_EXPIRY_KEY, expiry.toString());
                    if (loginOverlay) loginOverlay.remove();
                    document.body.style.overflow = 'auto';
                } else {
                    errorMsg.innerText = '❌ ' + result.message;
                }
            } catch (e) {
                errorMsg.innerText = '❌ ချိတ်ဆက်မှု အဆင်မပြေပါ။';
            } finally {
                submitBtn.disabled = false;
            }
        }
    }

    function toggleMode() {
        isRegisterMode = !isRegisterMode;
        const registerFields = document.getElementById('register-fields');
        const submitBtn = document.getElementById('login-submit-btn');
        const toggleBtn = document.getElementById('mode-toggle-btn');
        
        registerFields.style.display = isRegisterMode ? 'block' : 'none';
        submitBtn.innerText = isRegisterMode ? 'Register' : 'Login';
        toggleBtn.innerText = isRegisterMode ? 'Login' : 'Register';
        document.getElementById('login-error').innerText = '';
    }

    function showLoginModal() {
        if (isAuthenticated()) return;

        loginOverlay = document.createElement('div');
        loginOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f2b46 100%);
            z-index: 10000; display: flex; justify-content: center; align-items: center;
            font-family: sans-serif; backdrop-filter: blur(8px);
        `;
        
        loginOverlay.innerHTML = `
            <div style="background: white; border-radius: 25px; width: 90%; max-width: 380px; padding: 30px 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); text-align: center;">
                <h2 style="color: #1e3a5f; margin-bottom: 20px;">Hair Training</h2>
                
                <input type="text" id="login-username" maxlength="10" placeholder="Username (Max 10)" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 10px; outline: none;">
                
                <input type="password" id="login-password" placeholder="Password (Letter + Number)" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 10px; outline: none;">
                
                <div id="register-fields" style="display: none;">
                    <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                        <select id="country-code" style="padding: 10px; border: 1px solid #ddd; border-radius: 10px; outline: none;">
                            <option value="+959">+959 (MM)</option>
                            <option value="+66">+66 (TH)</option>
                            <option value="+1">+1 (US)</option>
                        </select>
                        <input type="tel" id="register-phone" maxlength="9" placeholder="Remaining 9 digits" style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 10px; outline: none;">
                    </div>
                    <input type="text" id="register-fullname" placeholder="Full Name" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 10px; outline: none;">
                    <input type="password" id="confirm-password" placeholder="Confirm Password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 10px; outline: none;">
                </div>

                <div id="login-error" style="font-size: 0.85rem; margin-bottom: 15px; min-height: 20px;"></div>
                
                <button id="login-submit-btn" style="background: #1e3a5f; color: white; border: none; width: 100%; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer;">Login</button>
                
                <p style="margin-top: 20px; font-size: 0.9rem; color: #666;">
                    အကောင့်မရှိသေးပါက? <button id="mode-toggle-btn" style="background: none; border: none; color: #1e3a5f; font-weight: bold; cursor: pointer; text-decoration: underline;">Register</button>
                </p>
            </div>
        `;
        
        document.body.appendChild(loginOverlay);
        document.getElementById('login-submit-btn').addEventListener('click', onSubmit);
        document.getElementById('mode-toggle-btn').addEventListener('click', toggleMode);
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showLoginModal);
    } else {
        showLoginModal();
    }
})();
