// ui-auth.js
let isRegisterMode = false;

const UIAuth = {
    showModal: function(onSubmitCallback) {
        const modal = document.createElement('div');
        modal.id = "auth-modal-overlay";
        modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;background:#1e3a5f;z-index:30000;display:flex;justify-content:center;align-items:center;padding:20px;backdrop-filter:blur(3px);box-sizing:border-box;";
        
        modal.innerHTML = `
            <div style="background:white;padding:30px;border-radius:20px;width:100%;max-width:340px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);position:relative;margin:0 auto;overflow:visible;">
                
                <!-- ========== OVERLAPPING PROFILE IMAGE (ဘောင်ကျော်ထွက်နေသောပုံစံ) ========== -->
                <div style="position:absolute;top:-50px;left:50%;transform:translateX(-50%);z-index:10;">
                    <div style="width:100px;height:100px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.2);padding:4px;">
                        <div style="width:92px;height:92px;background:#1e3a5f;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                            <img src="https://i.ibb.co/hJ0gXVHx/90ca1c90c577.png" 
                                 alt="Logo"
                                 style="width:92px;height:92px;border-radius:50%;object-fit:cover;"
                                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231e3a5f'/%3E%3Ctext x='50' y='67' text-anchor='middle' fill='white' font-size='40'%3E✂️%3C/text%3E%3C/svg%3E'">
                        </div>
                    </div>
                </div>
                <!-- =========================================================== -->
                
                <div style="margin-top:55px;">
                    <h3 id="modal-title" style="margin-bottom:20px;color:#1e3a5f;font-size:1.1rem;">DC_BARBER_ACADEMY</h3>
                    <h2 id="form-title" style="margin-bottom:20px;color:#1e3a5f;font-size:1.1rem;">Login</h2>
              
                </div>
                
                <input type="text" id="login-username" maxlength="10" placeholder="Username (6-10 chars)" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;outline:none;box-sizing:border-box;">
                
                <input type="password" id="login-password" maxlength="10" placeholder="Password (6-10 chars)" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;outline:none;box-sizing:border-box;">
                
                <div id="reg-fields" style="display:none;">
                    <div style="display:flex; margin-bottom:10px; border:1px solid #ddd; border-radius:10px; overflow:hidden;">
                        <select id="country-code" style="padding:10px; border:none; background:#f1f1f1; outline:none; font-size:14px; border-right:1px solid #ddd;">
                            <option value="+95">🇲🇲 +95</option>
                            <option value="+84">🇻🇳 +84</option>
                            <option value="+66">🇹🇭 +66</option>
                            <option value="+65">🇸🇬 +65</option>
                            <option value="+81">🇯🇵 +81</option>
                        </select>
                        <input type="tel" id="register-phone" maxlength="9" placeholder="9-digit number" style="flex:1; padding:12px; border:none; outline:none; box-sizing:border-box;">
                    </div>
                    <input type="text" id="register-fullname" maxlength="20" placeholder="Full Name (Max 20)" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;outline:none;box-sizing:border-box;">
                </div>
                
                <div id="login-error" style="font-size:0.75rem;margin-bottom:15px;min-height:20px;font-weight:500;line-height:1.2;"></div>
                
                <button id="login-submit-btn" style="width:100%;padding:14px;background:#1e3a5f;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:1rem;">Login</button>
                
                <p style="margin-top:20px;font-size:0.9rem;color:#666;">
                    <span id="mode-toggle-text">No account? </span>
                    <span id="mode-toggle-btn" style="color:#1e3a5f;font-weight:bold;cursor:pointer;text-decoration:underline;">Register</span>
                </p>
                
                <!-- Guest button will be added here by guest-mode.js -->
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 16px;">
                    <a href="/privacy.html" style="color: #1e3a5f; text-decoration: none; margin: 0 8px;"> Privacy Policy </a>
                    <span style="color: #ccc;">|</span>
                    <a href="/about.html" style="color: #1e3a5f; text-decoration: none; margin: 0 8px;"> ⓘ </a>
                </div>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('mode-toggle-btn').onclick = () => {
            isRegisterMode = !isRegisterMode;
            document.getElementById('form-title').innerText = isRegisterMode ? "Register" : "Login";
            document.getElementById('reg-fields').style.display = isRegisterMode ? 'block' : 'none';
            document.getElementById('login-submit-btn').innerText = isRegisterMode ? 'Register' : 'Login';
            document.getElementById('mode-toggle-text').innerText = isRegisterMode ? "Already have an account? " : "No account? ";
            document.getElementById('mode-toggle-btn').innerText = isRegisterMode ? "Login" : "Register";
            document.getElementById('login-error').innerText = "";
        };
        document.getElementById('login-submit-btn').onclick = onSubmitCallback;
    },

    showMessage: function(msg, isSuccess = false) {
        const errDiv = document.getElementById('login-error');
        if (errDiv) {
            errDiv.style.color = isSuccess ? "green" : "red";
            errDiv.innerText = msg;
        }
    }
};
