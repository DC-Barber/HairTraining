// ui-auth.js
let isRegisterMode = false;

const UIAuth = {
    showModal: function(onSubmitCallback) {
        const modal = document.createElement('div');
        modal.id = "auth-modal-overlay";
        modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#1e3a5f;z-index:30000;display:flex;justify-content:center;align-items:center;padding:20px;backdrop-filter:blur(3px);";
        
        modal.innerHTML = `
            <div style="background:white;padding:30px;border-radius:20px;width:100%;max-width:340px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                <h3 id="modal-title" style="margin-bottom:20px;color:#1e3a5f;font-size:1.4rem;">Just Hair Training </h3>
                
                <input type="text" id="login-username" maxlength="10" placeholder="Username (6-10 chars)" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;outline:none;box-sizing:border-box;">
                
                <input type="password" id="login-password" maxlength="10" placeholder="Password (6-10 chars)" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #ddd;border-radius:10px;outline:none;box-sizing:border-box;">
                
                <div id="reg-fields" style="display:none;">
                    <div style="display:flex; margin-bottom:10px; border:1px solid #ddd; border-radius:10px; overflow:hidden;">
                        <select id="country-code" style="padding:10px; border:none; background:#f1f1f1; outline:none; font-size:14px; border-right:1px solid #ddd;">
                            <option value="+95">🇲🇲 +95</option>
                            <option value="+84">🇻🇳 +66</option>
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
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('mode-toggle-btn').onclick = () => {
            isRegisterMode = !isRegisterMode;
            document.getElementById('modal-title').innerText = isRegisterMode ? "Register" : "Login";
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
