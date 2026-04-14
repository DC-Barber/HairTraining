(function() {
    // ==================== CONFIGURATION ====================
    const USERS_SHEET_API = 'https://script.google.com/macros/s/AKfycbzRBGdr-6wX0fvrkZ0B6DPlKdF0yvXzWzxV2nbra-916H3HkuCcpNwNRYicRU6LKencjg/exec';
    const HISTORY_SHEET_API = 'https://script.google.com/macros/s/AKfycbxEarnFSqXxG16vLEKJ7nwbCQcGNbQTEf7a-XVzSuuEgDY5DHqcwJ4uIraqK0x-ZzYL/exec';
    
    const AUTH_EXPIRY_KEY = 'hair_auth_expiry';
    const USER_DATA_KEY = 'hair_user_data';
    let isRegisterMode = false;

    // 1. IP Address နှင့် History ကို မှတ်တမ်းတင်ခြင်း
    async function recordLoginHistory(username) {
        try {
            // IP Address ကို ipify API မှတစ်ဆင့် ယူခြင်း
            let userIP = "Unknown";
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                userIP = data.ip;
            } catch (err) {
                console.error("IP Fetch Error:", err);
            }

            // Device ID ဖန်တီးခြင်း
            const deviceId = btoa(navigator.userAgent).substring(0, 32); 
            
            const historyData = {
                action: 'addHistory',
                username: username,
                deviceId: deviceId,             // Column C: DEVICE ID
                ipAddress: userIP,              // Column D: IP (တိကျသော IP)
                browserInfo: navigator.userAgent // Column E: FINGERPRINT
            };

            await fetch(HISTORY_SHEET_API, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(historyData)
            });
        } catch (e) {
            console.error("History recording error:", e);
        }
    }

    // 2. Login/Register Submit
    async function onSubmit() {
        const user = document.getElementById('login-username').value.trim();
        const pass = document.getElementById('login-password').value.trim();
        const err = document.getElementById('login-error');
        const btn = document.getElementById('login-submit-btn');

        if (!user || !pass) {
            err.innerText = "❌ အချက်အလက်များ ဖြည့်သွင်းပါ။";
            return;
        }

        btn.disabled = true;
        err.style.color = "#1e3a5f";
        err.innerText = "⏳ လုပ်ဆောင်နေပါသည်...";

        const payload = {
            action: isRegisterMode ? 'register' : 'login',
            username: user,
            password: pass
        };

        if (isRegisterMode) {
            payload.phone = "+959" + document.getElementById('register-phone').value.trim();
            payload.fullname = document.getElementById('register-fullname').value.trim();
        }

        try {
            const res = await fetch(USERS_SHEET_API, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status === 'success') {
                if (isRegisterMode) {
                    alert("စာရင်းသွင်းမှု အောင်မြင်သည်။ Admin အတည်ပြုချက် စောင့်ပါ။");
                    location.reload();
                } else {
                    // Login အောင်မြင်မှ IP အပါအဝင် History ကို မှတ်တမ်းတင်မည်
                    await recordLoginHistory(user);

                    localStorage.setItem(AUTH_EXPIRY_KEY, (new Date().getTime() + 86400000).toString());
                    localStorage.setItem(USER_DATA_KEY, JSON.stringify({
                        username: user, fullname: data.fullname, phone: data.phone
                    }));
                    location.reload();
                }
            } else {
                err.style.color = "red";
                err.innerText = "❌ " + data.message;
            }
        } catch (e) {
            err.innerText = "❌ ချိတ်ဆက်မှု အဆင်မပြေပါ။";
        } finally {
            btn.disabled = false;
        }
    }

    // --- ကျန်ရှိသော UI Functions (setupProfile, showLoginModal) များသည် ယခင်အတိုင်းဖြစ်သည် ---
    // (မှတ်ချက် - index.html ထဲတွင် ရှိပြီးသား Profile Card UI နှင့် ချိတ်ဆက်ရန်)

    function setupProfile() {
        const userData = JSON.parse(localStorage.getItem(USER_DATA_KEY) || '{}');
        const iconBtn = document.getElementById('profile-icon-btn');
        const overlay = document.getElementById('profile-overlay');

        if (iconBtn) {
            iconBtn.onclick = () => {
                document.getElementById('p-fullname').innerText = userData.fullname || '-';
                document.getElementById('p-username').innerText = userData.username || '-';
                document.getElementById('p-phone').innerText = userData.phone || '-';
                
                const lang = localStorage.getItem('site_lang') || 'mm';
                document.getElementById('lang-mm').style.background = (lang === 'mm') ? '#1e3a5f' : '#eee';
                document.getElementById('lang-mm').style.color = (lang === 'mm') ? 'white' : 'black';
                document.getElementById('lang-en').style.background = (lang === 'en') ? '#1e3a5f' : '#eee';
                document.getElementById('lang-en').style.color = (lang === 'en') ? 'white' : 'black';
                
                overlay.style.display = 'block';
            };
        }
        document.getElementById('close-profile').onclick = () => overlay.style.display = 'none';
        document.getElementById('lang-mm').onclick = () => { if(window.changeSiteLanguage) window.changeSiteLanguage('mm'); setupProfile(); };
        document.getElementById('lang-en').onclick = () => { if(window.changeSiteLanguage) window.changeSiteLanguage('en'); setupProfile(); };
    }

    window.logout = () => { localStorage.clear(); location.reload(); };

    function showLoginModal() {
        const modal = document.createElement('div');
        modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#1e3a5f;z-index:30000;display:flex;justify-content:center;align-items:center;padding:20px;";
        modal.innerHTML = `
            <div style=\"background:white;padding:30px;border-radius:20px;width:100%;max-width:340px;text-align:center;\">
                <h3 style=\"margin-bottom:20px;color:#1e3a5f;\">Login to Access</h3>
                <input type=\"text\" id=\"login-username\" placeholder=\"Username\" style=\"width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;\">
                <input type=\"password\" id=\"login-password\" placeholder=\"Password\" style=\"width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;\">
                <div id=\"reg-fields\" style=\"display:none;\">
                    <input type=\"tel\" id=\"register-phone\" placeholder=\"Phone (9xxxxxxx)\" style=\"width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;\">
                    <input type=\"text\" id=\"register-fullname\" placeholder=\"Full Name\" style=\"width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;\">
                </div>
                <div id=\"login-error\" style=\"font-size:0.8rem;margin-bottom:15px;min-height:20px;color:red;\"></div>
                <button id=\"login-submit-btn\" style=\"width:100%;padding:14px;background:#1e3a5f;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;\">Login</button>
                <p style=\"margin-top:20px;font-size:0.9rem;color:#666;\">No account? <span id=\"mode-toggle-btn\" style=\"color:#1e3a5f;font-weight:bold;cursor:pointer;text-decoration:underline;\">Register</span></p>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('mode-toggle-btn').onclick = () => {
            isRegisterMode = !isRegisterMode;
            document.getElementById('reg-fields').style.display = isRegisterMode ? 'block' : 'none';
            document.getElementById('login-submit-btn').innerText = isRegisterMode ? 'Register' : 'Login';
        };
        document.getElementById('login-submit-btn').onclick = onSubmit;
    }

    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (expiry && new Date().getTime() < parseInt(expiry)) setupProfile();
    else showLoginModal();
})();
