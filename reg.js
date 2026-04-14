(function() {
    // API CONFIG
    const USERS_SHEET_API = 'https://script.google.com/macros/s/AKfycbzRBGdr-6wX0fvrkZ0B6DPlKdF0yvXzWzxV2nbra-916H3HkuCcpNwNRYicRU6LKencjg/exec';
    
    const AUTH_TOKEN_KEY = 'hair_auth_token';
    const AUTH_EXPIRY_KEY = 'hair_auth_expiry';
    const USER_DATA_KEY = 'hair_user_data';
    
    let loginOverlay = null;
    let isRegisterMode = false;

    // --- Core Functions ---
    async function fetchWithTimeout(url, options) {
        return await fetch(url, { ...options, redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    }

    function isAuthenticated() {
        const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
        return expiry && new Date().getTime() <= parseInt(expiry);
    }

    window.logout = function() {
        localStorage.clear();
        location.reload();
    };

    // --- Profile & Language Logic ---
    function setupProfileSystem() {
        const profileBtn = document.getElementById('profile-icon-btn');
        const profileOverlay = document.getElementById('profile-overlay');
        const closeBtn = document.getElementById('close-profile');
        const langMM = document.getElementById('lang-mm');
        const langEN = document.getElementById('lang-en');

        profileBtn.addEventListener('click', () => {
            const userData = JSON.parse(localStorage.getItem(USER_DATA_KEY) || '{}');
            document.getElementById('p-fullname').innerText = userData.fullname || 'User';
            document.getElementById('p-username').innerText = userData.username || 'n/a';
            document.getElementById('p-phone').innerText = userData.phone || 'n/a';
            profileOverlay.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => profileOverlay.style.display = 'none');

        const updateLangUI = (lang) => {
            if (lang === 'mm') {
                langMM.style.background = '#1e3a5f'; langMM.style.color = 'white';
                langEN.style.background = 'white'; langEN.style.color = 'black';
            } else {
                langEN.style.background = '#1e3a5f'; langEN.style.color = 'white';
                langMM.style.background = 'white'; langMM.style.color = 'black';
            }
        };

        langMM.addEventListener('click', () => updateLangUI('mm'));
        langEN.addEventListener('click', () => updateLangUI('en'));
    }

    // --- Auth Logic ---
    async function onSubmit() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const errorMsg = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-submit-btn');

        if (isRegisterMode) {
            const countryCode = document.getElementById('country-code').value;
            const phoneInput = document.getElementById('register-phone').value.trim();
            const fullname = document.getElementById('register-fullname').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();

            if (username.length > 10) return errorMsg.innerText = '❌ Username ၁၀ လုံးထက်မကျော်ရပါ';
            if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return errorMsg.innerText = '❌ Password တွင် အက္ခရာနှင့် ဂဏန်းပါရမည်';
            if (password !== confirmPassword) return errorMsg.innerText = '❌ Passwords မတူပါ';
            if (phoneInput.length !== 9) return errorMsg.innerText = '❌ ဖုန်းနံပတ် ၉ လုံးအတိအကျရိုက်ပါ';

            submitBtn.disabled = true; errorMsg.innerText = '⏳ စာရင်းသွင်းနေသည်...';
            try {
                const res = await fetchWithTimeout(USERS_SHEET_API, {
                    method: 'POST', body: JSON.stringify({ action: 'register', username, password, phone: countryCode + phoneInput, fullname })
                });
                const result = await res.json();
                if (result.status === 'success') {
                    errorMsg.style.color = 'green'; errorMsg.innerText = '✅ အောင်မြင်သည်။ Admin အတည်ပြုချက်စောင့်ပါ။';
                    setTimeout(() => location.reload(), 3000);
                } else { errorMsg.innerText = '❌ ' + result.message; }
            } catch (e) { errorMsg.innerText = '❌ Error: ' + e.message; }
            finally { submitBtn.disabled = false; }
        } else {
            submitBtn.disabled = true; errorMsg.innerText = '⏳ ဝင်ရောက်နေသည်...';
            try {
                const res = await fetchWithTimeout(USERS_SHEET_API, {
                    method: 'POST', body: JSON.stringify({ action: 'login', username, password })
                });
                const result = await res.json();
                if (result.status === 'success') {
                    localStorage.setItem(AUTH_TOKEN_KEY, 'active');
                    localStorage.setItem(AUTH_EXPIRY_KEY, (new Date().getTime() + 86400000).toString());
                    localStorage.setItem(USER_DATA_KEY, JSON.stringify({ username, fullname: result.fullname, phone: result.phone }));
                    location.reload();
                } else { errorMsg.innerText = '❌ ' + result.message; }
            } catch (e) { errorMsg.innerText = '❌ Error တက်နေပါသည်။'; }
            finally { submitBtn.disabled = false; }
        }
    }

    function toggleMode() {
        isRegisterMode = !isRegisterMode;
        document.getElementById('register-fields').style.display = isRegisterMode ? 'block' : 'none';
        document.getElementById('login-submit-btn').innerText = isRegisterMode ? 'Register' : 'Login';
        document.getElementById('mode-toggle-btn').innerText = isRegisterMode ? 'Login' : 'Register';
    }

    function showLoginModal() {
        if (isAuthenticated()) {
            setupProfileSystem(); return;
        }
        loginOverlay = document.createElement('div');
        loginOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#1e3a5f;z-index:10000;display:flex;justify-content:center;align-items:center;font-family:sans-serif;";
        loginOverlay.innerHTML = `
            <div style="background:white;padding:30px;border-radius:25px;width:90%;max-width:350px;text-align:center;">
                <h2 style="color:#1e3a5f;margin-bottom:20px;">Hair Training</h2>
                <input type="text" id="login-username" maxlength="10" placeholder="Username (Max 10)" style="width:100%;padding:12px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;outline:none;">
                <input type="password" id="login-password" placeholder="Password (Letter+Num)" style="width:100%;padding:12px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;outline:none;">
                <div id="register-fields" style="display:none">
                    <div style="display:flex;gap:5px;margin-bottom:10px;">
                        <select id="country-code" style="padding:10px;border-radius:10px;border:1px solid #ddd;"><option value="+959">+959</option><option value="+66">+66</option></select>
                        <input type="tel" id="register-phone" maxlength="9" placeholder="Phone (9 digits)" style="flex:1;padding:12px;border-radius:10px;border:1px solid #ddd;">
                    </div>
                    <input type="text" id="register-fullname" placeholder="Full Name" style="width:100%;padding:12px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;">
                    <input type="password" id="confirm-password" placeholder="Confirm Password" style="width:100%;padding:12px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;">
                </div>
                <div id="login-error" style="color:red;font-size:12px;margin-bottom:15px;min-height:18px;"></div>
                <button id="login-submit-btn" style="width:100%;padding:14px;background:#1e3a5f;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Login</button>
                <p style="font-size:13px;margin-top:20px;">အကောင့်မရှိပါက? <span id="mode-toggle-btn" style="color:#1e3a5f;font-weight:bold;cursor:pointer;text-decoration:underline;">Register</span></p>
            </div>
        `;
        document.body.appendChild(loginOverlay);
        document.getElementById('login-submit-btn').addEventListener('click', onSubmit);
        document.getElementById('mode-toggle-btn').addEventListener('click', toggleMode);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showLoginModal);
    } else {
        showLoginModal();
    }
})();
