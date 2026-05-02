// main-auth.js - Full Optimized Version

async function handleAuthSubmit() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const country = isRegisterMode ? document.getElementById('country-code').value : "";
    const phone = isRegisterMode ? document.getElementById('register-phone').value.trim() : "";
    const name = isRegisterMode ? document.getElementById('register-fullname').value.trim() : "";

    const error = Validator.validate(user, pass, isRegisterMode, phone, name);
    if (error) return UIAuth.showMessage(error);

    UIAuth.showMessage("⏳ လုပ်ဆောင်နေပါသည်...", true);
    
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
        deviceId = await APIService.getDeviceId();
        localStorage.setItem('device_id', deviceId);
    }
    
    console.log("Device ID:", deviceId);

    const payload = { 
        action: isRegisterMode ? 'register' : 'login', 
        username: user, 
        password: pass, 
        deviceId: deviceId 
    };
    
    if (isRegisterMode) { 
        payload.phone = country + phone; 
        payload.fullname = name; 
    }

    try {
        const data = await APIService.submitAuth(payload);
        
        if (data.status === 'success') {
            if (isRegisterMode) {
                UIAuth.showMessage("✅ Register အောင်မြင်သည်။ Admin အတည်ပြုချက် စောင့်ပါ။", true);
                setTimeout(() => location.reload(), 3000);
            } else {
                await APIService.recordHistory(user, deviceId);
                localStorage.setItem(CONFIG.AUTH_EXPIRY_KEY, (new Date().getTime() + CONFIG.LOGIN_DURATION_MS).toString());
                
                // Get profile picture from sheet
                const profileResult = await APIService.getProfilePicture(user);
                
                const userData = { 
                    username: user, 
                    fullname: data.fullname, 
                    phone: data.phone,
                    profilePic: profileResult.success ? profileResult.imageUrl : null
                };
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                location.reload();
            }
        } else { 
            UIAuth.showMessage("❌ " + data.message); 
        }
    } catch (e) { 
        console.error(e);
        UIAuth.showMessage("❌ ချိတ်ဆက်မှု အဆင်မပြေပါ။"); 
    }
}

async function setupProfileSystem() {
    const profileBtn = document.getElementById('profile-icon-btn');
    const profileImg = document.getElementById('profile-img');
    const uploadStatus = document.getElementById('upload-status');
    const fileInput = document.getElementById('profile-upload');
    
    if (!profileImg || !fileInput || !uploadStatus) return;

    if (profileBtn) {
        profileBtn.onclick = async function() {
            // ✅ Show modal immediately
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'block';
            
            // ✅ Get user data from localStorage instantly
            let userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
            
            // ✅ Update basic info instantly
            if(document.getElementById('p-fullname')) document.getElementById('p-fullname').innerText = userData.fullname || '-';
            if(document.getElementById('p-username')) document.getElementById('p-username').innerText = userData.username || '-';
            if(document.getElementById('p-phone')) document.getElementById('p-phone').innerText = userData.phone || '-';
            
            // ✅ Show cached profile picture instantly
            if (userData.profilePic && userData.profilePic !== 'null') {
                profileImg.src = userData.profilePic;
            } else {
                profileImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%231e3a5f"/%3E%3Ctext x="50" y="67" text-anchor="middle" fill="white" font-size="40"%3E👤%3C/text%3E%3C/svg%3E';
            }
            
            // ✅ Background refresh from server (don't await)
            if (userData.username) {
                APIService.getProfilePicture(userData.username).then(freshProfile => {
                    if (freshProfile.success && freshProfile.imageUrl && freshProfile.imageUrl !== userData.profilePic) {
                        userData.profilePic = freshProfile.imageUrl;
                        localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                        profileImg.src = freshProfile.imageUrl;
                        console.log('Profile picture updated from server');
                    }
                }).catch(err => console.error('Background refresh failed:', err));
            }
            
            // ✅ Setup file upload handler (only once)
            if (fileInput && !fileInput.hasListener) {
                fileInput.hasListener = true;
                fileInput.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (!file) return;
                    
                    // Show preview immediately
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        profileImg.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                    
                    uploadStatus.innerHTML = '<span style="color:blue;">⏳ ပုံတင်နေသည်...</span>';
                    
                    const currentUserData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
                    const result = await APIService.uploadProfilePicture(file, currentUserData.username, currentUserData.fullname);
                    
                    if (result.success) {
                        currentUserData.profilePic = result.imageUrl;
                        localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(currentUserData));
                        uploadStatus.innerHTML = '<span style="color:green;">✅ ပုံတင်ခြင်း အောင်မြင်ပါသည်။</span>';
                        setTimeout(() => uploadStatus.innerHTML = '', 3000);
                    } else {
                        uploadStatus.innerHTML = '<span style="color:red;">❌ ပုံတင်ခြင်း မအောင်မြင်ပါ။</span>';
                    }
                };
            }
        };
    }

    const closeBtn = document.getElementById('close-profile');
    if (closeBtn) {
        closeBtn.onclick = function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'none';
            
            // Clear upload status when closing
            const statusDiv = document.getElementById('upload-status');
            if (statusDiv) statusDiv.innerHTML = '';
        };
    }
}

// Global functions
window.openExam = () => {
    window.location.href = 'exam/exam.html';
};

window.logout = () => { 
    localStorage.clear(); 
    location.reload(); 
};

window.syncProfilePicture = async function() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    if (userData.username) {
        const result = await APIService.forceRefreshProfilePicture(userData.username);
        if (result.success && result.imageUrl) {
            userData.profilePic = result.imageUrl;
            localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
            const profileImg = document.getElementById('profile-img');
            if (profileImg) profileImg.src = result.imageUrl;
            return true;
        }
    }
    return false;
};

// Initialize
(function init() {
    const expiry = localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY);
    const isAuth = expiry && new Date().getTime() < parseInt(expiry);
    if (isAuth) {
        setupProfileSystem();
    } else {
        UIAuth.showModal(handleAuthSubmit);
    }
})();