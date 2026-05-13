// main-auth.js - Simplified (Keep Original Upload System)

function updateHeaderProfileIcon(imageUrl) {
    const profileIcon = document.getElementById('profile-icon-btn');
    if (!profileIcon) return;
    
    if (imageUrl && imageUrl !== 'null' && imageUrl !== '') {
        profileIcon.style.background = 'none';
        profileIcon.style.padding = '0';
        profileIcon.style.overflow = 'hidden';
        profileIcon.innerHTML = `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.onerror=null; this.parentElement.innerHTML='👤'; this.parentElement.style.background='#1e3a5f';">`;
    } else {
        profileIcon.style.background = '#1e3a5f';
        profileIcon.innerHTML = '👤';
        profileIcon.style.display = 'flex';
        profileIcon.style.alignItems = 'center';
        profileIcon.style.justifyContent = 'center';
    }
}

function isGuestUser() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    const username = userData.username || '';
    return username.startsWith('guest_') || username.startsWith('visitor_') || localStorage.getItem('user_type') === 'guest';
}

async function handleAuthSubmit() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const country = isRegisterMode ? document.getElementById('country-code').value : "";
    const phone = isRegisterMode ? document.getElementById('register-phone').value.trim() : "";
    const name = isRegisterMode ? document.getElementById('register-fullname').value.trim() : "";

    const error = Validator.validate(user, pass, isRegisterMode, phone, name);
    if (error) return UIAuth.showMessage(error);

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = await APIService.getDeviceId();
        localStorage.setItem('device_id', deviceId);
    }

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
                
                const profileResult = await APIService.forceRefreshProfilePicture(user);
                
                const userData = { 
                    username: user, 
                    fullname: data.fullname, 
                    phone: data.phone,
                    profilePic: profileResult.success ? profileResult.imageUrl : null,
                    isGuest: user.startsWith('guest_') || user.startsWith('visitor_')
                };
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                
                if (userData.isGuest) localStorage.setItem('user_type', 'guest');
                
                updateHeaderProfileIcon(userData.profilePic);
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

// Keep original setupProfileSystem (with upload)
async function setupProfileSystem() {
    const profileBtn = document.getElementById('profile-icon-btn');
    const profileImg = document.getElementById('profile-img');
    const uploadStatus = document.getElementById('upload-status');
    const fileInput = document.getElementById('profile-upload');
    
    if (!profileBtn || !profileImg) return;

    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    updateHeaderProfileIcon(userData.profilePic);

    if (profileBtn) {
        profileBtn.onclick = async function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'block';
            
            let currentUserData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
            
            if(document.getElementById('p-fullname')) document.getElementById('p-fullname').innerText = currentUserData.fullname || '-';
            if(document.getElementById('p-username')) document.getElementById('p-username').innerText = currentUserData.username || '-';
            if(document.getElementById('p-phone')) document.getElementById('p-phone').innerText = currentUserData.phone || '-';
            
            if (currentUserData.profilePic && currentUserData.profilePic !== 'null') {
                profileImg.src = currentUserData.profilePic;
            } else {
                profileImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%231e3a5f"/%3E%3Ctext x="50" y="67" text-anchor="middle" fill="white" font-size="40"%3E👤%3C/text%3E%3C/svg%3E';
            }
            
            if (currentUserData.username && !isGuestUser()) {
                APIService.forceRefreshProfilePicture(currentUserData.username).then(freshProfile => {
                    if (freshProfile.success && freshProfile.imageUrl && freshProfile.imageUrl !== currentUserData.profilePic) {
                        currentUserData.profilePic = freshProfile.imageUrl;
                        localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(currentUserData));
                        profileImg.src = freshProfile.imageUrl;
                        updateHeaderProfileIcon(freshProfile.imageUrl);
                    }
                }).catch(err => console.error('Background refresh failed:', err));
            }
        };
    }

    // Original file upload handler
    if (fileInput && !fileInput.hasListener) {
        fileInput.hasListener = true;
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                profileImg.src = e.target.result;
                updateHeaderProfileIcon(e.target.result);
            };
            reader.readAsDataURL(file);
            
            if (uploadStatus) uploadStatus.innerHTML = '<span style="color:blue;">⏳ ပုံတင်နေသည်...</span>';
            
            const currentUserData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
            const result = await APIService.uploadProfilePicture(file, currentUserData.username, currentUserData.fullname);
            
            if (result.success) {
                currentUserData.profilePic = result.imageUrl;
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(currentUserData));
                if (uploadStatus) uploadStatus.innerHTML = '<span style="color:green;">✅ ပုံတင်ခြင်း အောင်မြင်ပါသည်။</span>';
                updateHeaderProfileIcon(result.imageUrl);
                setTimeout(() => { if (uploadStatus) uploadStatus.innerHTML = ''; }, 3000);
            } else {
                if (uploadStatus) uploadStatus.innerHTML = '<span style="color:red;">❌ ပုံတင်ခြင်း မအောင်မြင်ပါ။</span>';
                if (currentUserData.profilePic && currentUserData.profilePic !== 'null') {
                    profileImg.src = currentUserData.profilePic;
                    updateHeaderProfileIcon(currentUserData.profilePic);
                }
            }
        };
    }

    const closeBtn = document.getElementById('close-profile');
    if (closeBtn) {
        closeBtn.onclick = function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'none';
            if (uploadStatus) uploadStatus.innerHTML = '';
        };
    }
}

window.openExam = () => {
    if (isGuestUser()) {
        alert("⚠️ Guest User များ Exam ဖြေဆိုခွင့်မရှိပါ။\nPlease register or login with a full account.");
        return;
    }
    window.location.href = 'exam/exam.html';
};

window.logout = () => { 
    localStorage.clear(); 
    location.reload(); 
};

(function init() {
    const expiry = localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY);
    const isAuth = expiry && new Date().getTime() < parseInt(expiry);
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    const isGuest = userData.isGuest || isGuestUser();
    
    if (isAuth || isGuest) {
        setupProfileSystem();
    } else {
        UIAuth.showModal(handleAuthSubmit);
    }
})();